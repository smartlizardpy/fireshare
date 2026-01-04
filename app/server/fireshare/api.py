import json
import os, re, string
import shutil
import random
import logging
from subprocess import Popen
from textwrap import indent
from flask import Blueprint, render_template, request, Response, jsonify, current_app, send_file, redirect
from flask_login import current_user, login_required
from flask_cors import CORS
from sqlalchemy.sql import text
from pathlib import Path
import time
from werkzeug.utils import secure_filename


from . import db, logger
from .models import Video, VideoInfo, VideoView, GameMetadata, VideoGameLink
from .constants import SUPPORTED_FILE_TYPES
from datetime import datetime

templates_path = os.environ.get('TEMPLATE_PATH') or 'templates'
api = Blueprint('api', __name__, template_folder=templates_path)

CORS(api, supports_credentials=True)

def get_steamgriddb_api_key():
    """
    Get SteamGridDB API key from config.json first, then fall back to environment variable.
    """
    # First check config.json
    paths = current_app.config['PATHS']
    config_path = paths['data'] / 'config.json'
    if config_path.exists():
        try:
            with open(config_path, 'r') as configfile:
                config = json.load(configfile)
                api_key = config.get('integrations', {}).get('steamgriddb_api_key', '')
                if api_key:
                    return api_key
        except:
            pass

    # Fall back to environment variable
    return os.environ.get('STEAMGRIDDB_API_KEY', '')

def get_video_path(id, subid=None, quality=None):
    video = Video.query.filter_by(video_id=id).first()
    if not video:
        raise Exception(f"No video found for {id}")
    paths = current_app.config['PATHS']
    
    # Handle quality variants (720p, 1080p)
    if quality and quality in ['720p', '1080p']:
        # Check if the transcoded version exists
        derived_path = paths["processed"] / "derived" / id / f"{id}-{quality}.mp4"
        if derived_path.exists():
            return str(derived_path)
        # Fall back to original if quality doesn't exist
        logger.warning(f"Requested quality {quality} for video {id} not found, falling back to original")
    
    subid_suffix = f"-{subid}" if subid else ""
    ext = ".mp4" if subid else video.extension
    video_path = paths["processed"] / "video_links" / f"{id}{subid_suffix}{ext}"
    return str(video_path)

@api.route('/w/<video_id>')
def video_metadata(video_id):
    video = Video.query.filter_by(video_id=video_id).first()
    domain = f"https://{current_app.config['DOMAIN']}" if current_app.config['DOMAIN'] else ""
    if video:
        return render_template('metadata.html', video=video.json(), domain=domain)
    else:
        return redirect('{}/#/w/{}'.format(domain, video_id), code=302)

@api.route('/api/config')
def config():
    paths = current_app.config['PATHS']
    config_path = paths['data'] / 'config.json'
    file = open(config_path)
    config = json.load(file)
    file.close()
    if config_path.exists():
        return config["ui_config"]
    else:
        return jsonify({})

@api.route('/api/admin/config', methods=["GET", "PUT"])
@login_required
def get_or_update_config():
    paths = current_app.config['PATHS']
    if request.method == 'GET':
        config_path = paths['data'] / 'config.json'
        file = open(config_path)
        config = json.load(file)
        file.close()
        if config_path.exists():
            return config
        else:
            return jsonify({})
    if request.method == 'PUT':
        config = request.json["config"]
        config_path = paths['data'] / 'config.json'
        if not config:
            return Response(status=400, response='A config must be provided.')
        if not config_path.exists():
            return Response(status=500, response='Could not find a config to update.')
        config_path.write_text(json.dumps(config, indent=2))

        # Check if SteamGridDB API key was added and remove warning if present
        steamgrid_api_key = config.get('integrations', {}).get('steamgriddb_api_key', '')
        if steamgrid_api_key:
            steamgridWarning = "SteamGridDB API key not configured. Game metadata features are unavailable. Click here to set it up."
            if steamgridWarning in current_app.config['WARNINGS']:
                current_app.config['WARNINGS'].remove(steamgridWarning)

        return Response(status=200)

@api.route('/api/admin/warnings', methods=["GET"])
@login_required
def get_warnings():
    warnings = current_app.config['WARNINGS']
    if request.method == 'GET':
        if len(warnings) == 0:
            return jsonify({})
        else:
            return jsonify(warnings)

@api.route('/api/manual/scan')
@login_required
def manual_scan():
    if not current_app.config["ENVIRONMENT"] == 'production':
        return Response(response='You must be running in production for this task to work.', status=400)
    else:
        current_app.logger.info(f"Executed manual scan")
        Popen(["fireshare", "bulk-import"], shell=False)
    return Response(status=200)

@api.route('/api/videos')
@login_required
def get_videos():
    sort = request.args.get('sort')
    # Check that the sort parameter is one of the allowed values 
    allowed_sorts = [
        'updated_at desc',
        'updated_at asc',
        'video_info.title desc',
        'video_info.title asc',
        'views desc',
        'views asc'
    ]
    if sort not in allowed_sorts:
        return jsonify({"error": "Invalid sort parameter"}), 400      

    if "views" in sort:
        videos = Video.query.join(VideoInfo).all()
    else:
        videos = Video.query.join(VideoInfo).order_by(text(sort)).all()

    videos_json = []
    for v in videos:
        vjson = v.json()
        vjson["view_count"] = VideoView.count(v.video_id)
        videos_json.append(vjson)

    if sort == "views asc":
        videos_json = sorted(videos_json, key=lambda d: d['view_count'])
    if sort == 'views desc':
        videos_json = sorted(videos_json, key=lambda d: d['view_count'], reverse=True)

    return jsonify({"videos": videos_json})

@api.route('/api/video/random')
@login_required
def get_random_video():
    row_count = Video.query.count()
    random_video = Video.query.offset(int(row_count * random.random())).first()
    current_app.logger.info(f"Fetched random video {random_video.video_id}: {random_video.info.title}")
    vjson = random_video.json()
    vjson["view_count"] = VideoView.count(random_video.video_id)
    return jsonify(vjson)

@api.route('/api/video/public/random')
def get_random_public_video():
    row_count =  Video.query.filter(Video.info.has(private=False)).filter_by(available=True).count()
    random_video = Video.query.filter(Video.info.has(private=False)).filter_by(available=True).offset(int(row_count * random.random())).first()
    current_app.logger.info(f"Fetched public random video {random_video.video_id}: {random_video.info.title}")
    vjson = random_video.json()
    vjson["view_count"] = VideoView.count(random_video.video_id)
    return jsonify(vjson)

@api.route('/api/videos/public')
def get_public_videos():
    sort = request.args.get('sort')

    # Check that the sort parameter is one of the allowed values 
    allowed_sorts = [
        'updated_at desc',
        'updated_at asc',
        'video_info.title desc',
        'video_info.title asc',
        'views desc',
        'views asc'
    ]
    if sort not in allowed_sorts:
        return jsonify({"error": "Invalid sort parameter"}), 400        

    if "views" in sort:
        videos = Video.query.join(VideoInfo).filter_by(private=False)
    else:
        videos = Video.query.join(VideoInfo).filter_by(private=False).order_by(text(sort))
    
    videos_json = []
    for v in videos:
        vjson = v.json()
        if (not vjson["available"]):
            continue
        vjson["view_count"] = VideoView.count(v.video_id)
        videos_json.append(vjson)

    if sort == "views asc":
        videos_json = sorted(videos_json, key=lambda d: d['view_count'])
    if sort == 'views desc':
        videos_json = sorted(videos_json, key=lambda d: d['view_count'], reverse=True)

    return jsonify({"videos": videos_json})

@api.route('/api/video/delete/<id>', methods=["DELETE"])
@login_required
def delete_video(id):
    video = Video.query.filter_by(video_id=id).first()
    if video:
        logging.info(f"Deleting video: {video.video_id}")
        
        paths = current_app.config['PATHS']
        file_path = paths['video'] / video.path
        link_path = paths['processed'] / 'video_links' / f"{id}{video.extension}"
        derived_path = paths['processed'] / 'derived' / id
        
        VideoInfo.query.filter_by(video_id=id).delete()
        Video.query.filter_by(video_id=id).delete()
        db.session.commit()
        
        try:
            if file_path.exists():
                file_path.unlink()
                logging.info(f"Deleted video file: {file_path}")
            if link_path.exists() or link_path.is_symlink():
                link_path.unlink()
                logging.info(f"Deleted link file: {link_path}")
            if derived_path.exists():
                shutil.rmtree(derived_path)
                logging.info(f"Deleted derived directory: {derived_path}")
        except OSError as e:
            logging.error(f"Error deleting files for video {id}: {e}")
            logging.error(f"Attempted to delete: file={file_path}, link={link_path}, derived={derived_path}")
        return Response(status=200)
        
    else:
        return Response(status=404, response=f"A video with id: {id}, does not exist.")

@api.route('/api/video/details/<id>', methods=["GET", "PUT"])
def handle_video_details(id):
    if request.method == 'GET':
        # db lookup and get the details title/views/etc
        # video_id = request.args['id']
        video = Video.query.filter_by(video_id=id).first()
        if video:
            vjson = video.json()
            vjson["view_count"] = VideoView.count(video.video_id)
            return jsonify(vjson)
        else:
            return jsonify({
                'message': 'Video not found'
            }), 404
    if request.method == 'PUT':
        if not current_user.is_authenticated:
            return Response(response='You do not have access to this resource.', status=401)
        video_info = VideoInfo.query.filter_by(video_id=id).first()
        if video_info:
            db.session.query(VideoInfo).filter_by(video_id=id).update(request.json)
            db.session.commit()
            return Response(status=201)
        else:
            return jsonify({
                'message': 'Video details not found'
            }), 404

@api.route('/api/video/poster', methods=['GET'])
def get_video_poster():
    video_id = request.args['id']
    webm_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "boomerang-preview.webm")
    jpg_poster_path = Path(current_app.config["PROCESSED_DIRECTORY"], "derived", video_id, "poster.jpg")
    if request.args.get('animated'):
        return send_file(webm_poster_path, mimetype='video/webm')
    else:
        return send_file(jpg_poster_path, mimetype='image/jpg')

@api.route('/api/video/view', methods=['POST'])
def add_video_view():
    video_id = request.json['video_id']
    if request.headers.getlist("X-Forwarded-For"):
        ip_address = request.headers.getlist("X-Forwarded-For")[0].split(",")[0]
    else:
        ip_address = request.remote_addr
    VideoView.add_view(video_id, ip_address)
    return Response(status=200)

@api.route('/api/video/<video_id>/views', methods=['GET'])
def get_video_views(video_id):
    views = VideoView.count(video_id)
    return str(views)

@api.route('/api/upload/public', methods=['POST'])
def public_upload_video():
    paths = current_app.config['PATHS']
    with open(paths['data'] / 'config.json', 'r') as configfile:
        try:
            config = json.load(configfile)
        except:
            logging.error("Invalid or corrupt config file")
            return Response(status=400)
        configfile.close()
        
    if not config['app_config']['allow_public_upload']:
        logging.warn("A public upload attempt was made but public uploading is disabled")
        return Response(status=401)
    
    upload_folder = config['app_config']['public_upload_folder_name']

    if 'file' not in request.files:
        return Response(status=400)
    file = request.files['file']
    if file.filename == '':
        return Response(status=400)
    filename = secure_filename(file.filename)
    if not filename:
        return Response(status=400)
    filetype = filename.split('.')[-1]
    if not filetype in SUPPORTED_FILE_TYPES:
        return Response(status=400)
    upload_directory = paths['video'] / upload_folder
    if not os.path.exists(upload_directory):
        os.makedirs(upload_directory)
    save_path = os.path.join(upload_directory, filename)
    if (os.path.exists(save_path)):
        name_no_type = ".".join(filename.split('.')[0:-1])
        uid = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
        save_path = os.path.join(paths['video'], upload_folder, f"{name_no_type}-{uid}.{filetype}")
    file.save(save_path)
    Popen(["fireshare", "scan-video", f"--path={save_path}"], shell=False)
    return Response(status=201)

@api.route('/api/uploadChunked/public', methods=['POST'])
def public_upload_videoChunked():
    paths = current_app.config['PATHS']
    with open(paths['data'] / 'config.json', 'r') as configfile:
        try:
            config = json.load(configfile)
        except:
            logging.error("Invalid or corrupt config file")
            return Response(status=400)
        configfile.close()
        
    if not config['app_config']['allow_public_upload']:
        logging.warn("A public upload attempt was made but public uploading is disabled")
        return Response(status=401)
    
    upload_folder = config['app_config']['public_upload_folder_name']

    required_files = ['blob']
    required_form_fields = ['chunkPart', 'totalChunks', 'checkSum']
    if not all(key in request.files for key in required_files) or not all(key in request.form for key in required_form_fields):
        return Response(status=400)   
    blob = request.files.get('blob')
    chunkPart = int(request.form.get('chunkPart'))
    totalChunks = int(request.form.get('totalChunks'))
    checkSum = request.form.get('checkSum')
    if not blob.filename or blob.filename.strip() == '' or blob.filename == 'blob':
        return Response(status=400)
    filename = secure_filename(blob.filename)
    if not filename:
        return Response(status=400)
    filetype = filename.split('.')[-1] # TODO, probe filetype with fmpeg instead and remux to supporrted
    if not filetype in SUPPORTED_FILE_TYPES:
        return Response(status=400)
     
    upload_directory = paths['video'] / upload_folder
    if not os.path.exists(upload_directory):
        os.makedirs(upload_directory) 
    tempPath = os.path.join(upload_directory, f"{checkSum}.{filetype}")
    with open(tempPath, 'ab') as f:
        f.write(blob.read())
    if chunkPart < totalChunks:
        return Response(status=202)
    
    save_path = os.path.join(upload_directory, filename)

    if (os.path.exists(save_path)):
        name_no_type = ".".join(filename.split('.')[0:-1])
        uid = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
        save_path = os.path.join(paths['video'], upload_folder, f"{name_no_type}-{uid}.{filetype}")
    
    os.rename(tempPath, save_path)
    Popen(["fireshare", "scan-video", f"--path={save_path}"], shell=False)
    return Response(status=201)

@api.route('/api/upload', methods=['POST'])
@login_required
def upload_video():
    paths = current_app.config['PATHS']
    with open(paths['data'] / 'config.json', 'r') as configfile:
        try:
            config = json.load(configfile)
        except:
            return Response(status=500, response="Invalid or corrupt config file")
        configfile.close()
    
    upload_folder = config['app_config']['admin_upload_folder_name']

    if 'file' not in request.files:
        return Response(status=400)
    file = request.files['file']
    if file.filename == '':
        return Response(status=400)
    filename = secure_filename(file.filename)
    if not filename:
        return Response(status=400)
    filetype = filename.split('.')[-1]
    if not filetype in SUPPORTED_FILE_TYPES:
        return Response(status=400)
    upload_directory = paths['video'] / upload_folder
    if not os.path.exists(upload_directory):
        os.makedirs(upload_directory)
    save_path = os.path.join(upload_directory, filename)
    if (os.path.exists(save_path)):
        name_no_type = ".".join(filename.split('.')[0:-1])
        uid = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
        save_path = os.path.join(paths['video'], upload_folder, f"{name_no_type}-{uid}.{filetype}")
    file.save(save_path)
    Popen(["fireshare", "scan-video", f"--path={save_path}"], shell=False)
    return Response(status=201)

@api.route('/api/uploadChunked', methods=['POST'])
@login_required
def upload_videoChunked():
    paths = current_app.config['PATHS']
    with open(paths['data'] / 'config.json', 'r') as configfile:
        try:
            config = json.load(configfile)
        except:
            return Response(status=500, response="Invalid or corrupt config file")
        configfile.close()
    
    upload_folder = config['app_config']['admin_upload_folder_name']

    required_files = ['blob']
    required_form_fields = ['chunkPart', 'totalChunks', 'checkSum', 'fileName', 'fileSize']

    if not all(key in request.files for key in required_files) or not all(key in request.form for key in required_form_fields):
        return Response(status=400)
        
    blob = request.files.get('blob')
    chunkPart = int(request.form.get('chunkPart'))
    totalChunks = int(request.form.get('totalChunks'))
    checkSum = request.form.get('checkSum')
    fileName = secure_filename(request.form.get('fileName'))
    fileSize = int(request.form.get('fileSize'))
    
    if not fileName:
        return Response(status=400)
    
    filetype = fileName.split('.')[-1]
    if not filetype in SUPPORTED_FILE_TYPES:
        return Response(status=400)
    
    upload_directory = paths['video'] / upload_folder
    if not os.path.exists(upload_directory):
        os.makedirs(upload_directory)
    
    # Store chunks with part number to ensure proper ordering
    tempPath = os.path.join(upload_directory, f"{checkSum}.part{chunkPart:04d}")
    
    # Write this specific chunk
    with open(tempPath, 'wb') as f:
        f.write(blob.read())

    # Check if we have all chunks
    chunk_files = []
    for i in range(1, totalChunks + 1):
        chunk_path = os.path.join(upload_directory, f"{checkSum}.part{i:04d}")
        if os.path.exists(chunk_path):
            chunk_files.append(chunk_path)
    
    # If we don't have all chunks yet, return 202
    if len(chunk_files) != totalChunks:
        return Response(status=202)

    # All chunks received, reassemble the file
    save_path = os.path.join(upload_directory, fileName)
    
    if os.path.exists(save_path):
        name_no_type = ".".join(fileName.split('.')[0:-1])
        uid = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
        save_path = os.path.join(upload_directory, f"{name_no_type}-{uid}.{filetype}")

    # Reassemble chunks in correct order
    try:
        with open(save_path, 'wb') as output_file:
            for i in range(1, totalChunks + 1):
                chunk_path = os.path.join(upload_directory, f"{checkSum}.part{i:04d}")
                with open(chunk_path, 'rb') as chunk_file:
                    output_file.write(chunk_file.read())
                # Clean up chunk file
                os.remove(chunk_path)
        
        # Verify file size
        if os.path.getsize(save_path) != fileSize:
            os.remove(save_path)
            return Response(status=500, response="File size mismatch after reassembly")
            
    except Exception as e:
        # Clean up on error
        for chunk_path in chunk_files:
            if os.path.exists(chunk_path):
                os.remove(chunk_path)
        if os.path.exists(save_path):
            os.remove(save_path)
        return Response(status=500, response="Error reassembling file")

    Popen(["fireshare", "scan-video", f"--path={save_path}"], shell=False)
    return Response(status=201)

@api.route('/api/video')
def get_video():
    video_id = request.args.get('id')
    subid = request.args.get('subid')
    quality = request.args.get('quality')  # Support quality parameter (720p, 1080p)
    video_path = get_video_path(video_id, subid, quality)
    file_size = os.stat(video_path).st_size
    start = 0
    length = 10240

    range_header = request.headers.get('Range', None)
    if range_header:
        m = re.search('([0-9]+)-([0-9]*)', range_header)
        g = m.groups()
        byte1, byte2 = 0, None
        if g[0]:
            byte1 = int(g[0])
        if g[1]:
            byte2 = int(g[1])
        if byte1 < file_size:
            start = byte1
        if byte2:
            length = byte2 + 1 - byte1
        else:
            length = file_size - start

    with open(video_path, 'rb') as f:
        f.seek(start)
        chunk = f.read(length)

    rv = Response(chunk, 206, mimetype='video/mp4', content_type='video/mp4', direct_passthrough=True)
    rv.headers.add('Content-Range', 'bytes {0}-{1}/{2}'.format(start, start + length - 1, file_size))
    return rv
    
def get_folder_size(folder_path):
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(folder_path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.isfile(fp):  # Avoid broken symlinks
                total_size += os.path.getsize(fp)
    return total_size

@api.route('/api/folder-size', methods=['GET'])
def folder_size():
    print("Folder size endpoint was hit!")  # Debugging line
    path = request.args.get('path', default='.', type=str)
    size_bytes = get_folder_size(path)
    size_mb = size_bytes / (1024 * 1024)

    if size_mb < 1024:
        rounded_mb = round(size_mb / 100) * 100
        size_pretty = f"{rounded_mb} MB"
    elif size_mb < 1024 * 1024:
        size_gb = size_mb / 1024
        size_pretty = f"{round(size_gb, 1)} GB"
    else:
        size_tb = size_mb / (1024 * 1024)
        size_pretty = f"{round(size_tb, 1)} TB"

    return jsonify({
        "folder": path,
        "size_bytes": size_bytes,
        "size_pretty": size_pretty
    })

@api.route('/api/steamgrid/search', methods=["GET"])
def search_steamgrid():
    query = request.args.get('query')
    if not query:
        return Response(status=400, response='Query parameter is required.')

    api_key = get_steamgriddb_api_key()
    if not api_key:
        return Response(status=503, response='SteamGridDB API key not configured.')

    from .steamgrid import SteamGridDBClient
    client = SteamGridDBClient(api_key)

    results = client.search_games(query)
    return jsonify(results)

@api.route('/api/steamgrid/game/<int:game_id>/assets', methods=["GET"])
def get_steamgrid_assets(game_id):
    api_key = get_steamgriddb_api_key()
    if not api_key:
        return Response(status=503, response='SteamGridDB API key not configured.')

    from .steamgrid import SteamGridDBClient
    client = SteamGridDBClient(api_key)

    assets = client.get_game_assets(game_id)
    return jsonify(assets)

@api.route('/api/games', methods=["GET"])
def get_games():
    from flask_login import current_user

    # If user is authenticated, show all games
    if current_user.is_authenticated:
        games = GameMetadata.query.all()
    else:
        # For public users, only show games that have at least one public (available) video
        games = (
            db.session.query(GameMetadata)
            .join(VideoGameLink)
            .join(Video)
            .join(VideoInfo)
            .filter(
                Video.available.is_(True),
                VideoInfo.private.is_(False),
            )
            .distinct()
            .all()
        )

    return jsonify([game.json() for game in games])

@api.route('/api/games', methods=["POST"])
@login_required
def create_game():
    data = request.json

    if not data or not data.get('name'):
        return Response(status=400, response='Game name is required.')

    if not data.get('steamgriddb_id'):
        return Response(status=400, response='SteamGridDB ID is required.')

    # Get API key and initialize client
    api_key = get_steamgriddb_api_key()
    if not api_key:
        return Response(status=503, response='SteamGridDB API key not configured.')

    from .steamgrid import SteamGridDBClient
    client = SteamGridDBClient(api_key)

    # Download and save assets
    paths = current_app.config['PATHS']
    game_assets_dir = paths['data'] / 'game_assets'

    result = client.download_and_save_assets(data['steamgriddb_id'], game_assets_dir)

    if not result['success']:
        current_app.logger.error(f"Failed to download assets for game {data['name']}: {result['error']}")
        return Response(
            status=500,
            response=f"Failed to download game assets: {result['error']}"
        )

    # Create game metadata (without URL fields - they will be constructed dynamically)
    game = GameMetadata(
        steamgriddb_id=data['steamgriddb_id'],
        name=data['name'],
        release_date=data.get('release_date'),
        # Do NOT set hero_url, logo_url, icon_url - they will be constructed dynamically
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.session.add(game)
    db.session.commit()

    current_app.logger.info(f"Created game {data['name']} with assets: {result['assets']}")

    return jsonify(game.json()), 201

@api.route('/api/videos/<video_id>/game', methods=["POST"])
@login_required
def link_video_to_game(video_id):
    data = request.json

    if not data or not data.get('game_id'):
        return Response(status=400, response='Game ID is required.')

    video = Video.query.filter_by(video_id=video_id).first()
    if not video:
        return Response(status=404, response='Video not found.')

    game = GameMetadata.query.get(data['game_id'])
    if not game:
        return Response(status=404, response='Game not found.')

    existing_link = VideoGameLink.query.filter_by(video_id=video_id).first()
    if existing_link:
        existing_link.game_id = data['game_id']
        existing_link.created_at = datetime.utcnow()
    else:
        link = VideoGameLink(
            video_id=video_id,
            game_id=data['game_id'],
            created_at=datetime.utcnow()
        )
        db.session.add(link)

    db.session.commit()

    return jsonify({"video_id": video_id, "game_id": data['game_id']}), 201

@api.route('/api/videos/<video_id>/game', methods=["GET"])
def get_video_game(video_id):
    link = VideoGameLink.query.filter_by(video_id=video_id).first()
    if not link:
        return jsonify(None)
    return jsonify(link.game.json())

@api.route('/api/videos/<video_id>/game', methods=["DELETE"])
@login_required
def unlink_video_from_game(video_id):
    link = VideoGameLink.query.filter_by(video_id=video_id).first()
    if not link:
        return Response(status=404, response='Video is not linked to any game.')

    db.session.delete(link)
    db.session.commit()

    return Response(status=204)

@api.route('/api/game/assets/<int:steamgriddb_id>/<filename>')
def get_game_asset(steamgriddb_id, filename):
    # Validate filename to prevent path traversal
    if not re.match(r'^(hero_[12]|logo_1|icon_1)\.(png|jpg|jpeg|webp)$', filename):
        return Response(status=400, response='Invalid filename.')

    paths = current_app.config['PATHS']
    asset_path = paths['data'] / 'game_assets' / str(steamgriddb_id) / filename

    if not asset_path.exists():
        # Try other extensions if the requested one doesn't exist
        base_name = filename.rsplit('.', 1)[0]
        asset_dir = paths['data'] / 'game_assets' / str(steamgriddb_id)

        if asset_dir.exists():
            for ext in ['.png', '.jpg', '.jpeg', '.webp']:
                alternative_path = asset_dir / f'{base_name}{ext}'
                if alternative_path.exists():
                    asset_path = alternative_path
                    break

    # If asset still doesn't exist, try to re-download from SteamGridDB
    if not asset_path.exists():
        logger.warning(f"{filename} missing for game {steamgriddb_id}")
        api_key = get_steamgriddb_api_key()
        if api_key:
            from .steamgrid import SteamGridDBClient
            client = SteamGridDBClient(api_key)
            game_assets_dir = paths['data'] / 'game_assets'

            logger.info(f"Downloading assets for game {steamgriddb_id}")
            result = client.download_and_save_assets(steamgriddb_id, game_assets_dir)

            if result.get('success'):
                logger.info(f"Assets downloaded for game {steamgriddb_id}: {result.get('assets')}")
                # Try to find the file again after re-download
                base_name = filename.rsplit('.', 1)[0]
                asset_dir = paths['data'] / 'game_assets' / str(steamgriddb_id)
                for ext in ['.png', '.jpg', '.jpeg', '.webp']:
                    alternative_path = asset_dir / f'{base_name}{ext}'
                    if alternative_path.exists():
                        asset_path = alternative_path
                        logger.info(f"Found {alternative_path.name}")
                        break
            else:
                logger.error(f"Download failed for game {steamgriddb_id}: {result.get('error')}")
        else:
            logger.warning(f"Download failed for game {steamgriddb_id}: No SteamGridDB API key configured")

    if not asset_path.exists():
        return Response(status=404, response='Asset not found.')

    # Determine MIME type from extension
    ext = asset_path.suffix.lower()
    mime_types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp'
    }
    mime_type = mime_types.get(ext, 'image/png')

    return send_file(asset_path, mimetype=mime_type)

@api.route('/api/games/<int:steamgriddb_id>/videos', methods=["GET"])
def get_game_videos(steamgriddb_id):
    from flask_login import current_user

    game = GameMetadata.query.filter_by(steamgriddb_id=steamgriddb_id).first()
    if not game:
        return Response(status=404, response='Game not found.')

    videos_json = []
    for link in game.videos:
        if not current_user.is_authenticated:
            # Only show available, non-private videos to public users
            if not link.video.available:
                continue
            if not link.video.info or link.video.info.private:
                continue

        vjson = link.video.json()
        vjson["view_count"] = VideoView.count(link.video_id)
        videos_json.append(vjson)

    return jsonify(videos_json)

@api.route('/api/games/<int:steamgriddb_id>', methods=["DELETE"])
@login_required
def delete_game(steamgriddb_id):
    """
    Delete a game and optionally all associated videos.
    Query param: delete_videos (boolean) - if true, also delete all videos linked to this game
    """
    game = GameMetadata.query.filter_by(steamgriddb_id=steamgriddb_id).first()
    if not game:
        return Response(status=404, response='Game not found.')

    delete_videos = request.args.get('delete_videos', 'false').lower() == 'true'

    logger.info(f"Deleting game {game.name} (steamgriddb_id: {steamgriddb_id}), delete_videos={delete_videos}")

    # Get all video links for this game
    video_links = VideoGameLink.query.filter_by(game_id=game.id).all()

    if delete_videos and video_links:
        # Delete all associated videos
        paths = current_app.config['PATHS']
        for link in video_links:
            video = link.video
            logger.info(f"Deleting video: {video.video_id}")

            file_path = paths['video'] / video.path
            link_path = paths['processed'] / 'video_links' / f"{video.video_id}{video.extension}"
            derived_path = paths['processed'] / 'derived' / video.video_id

            # Delete from database
            VideoInfo.query.filter_by(video_id=video.video_id).delete()
            Video.query.filter_by(video_id=video.video_id).delete()

            # Delete files
            try:
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"Deleted video file: {file_path}")
                if link_path.exists() or link_path.is_symlink():
                    link_path.unlink()
                    logger.info(f"Deleted link file: {link_path}")
                if derived_path.exists():
                    shutil.rmtree(derived_path)
                    logger.info(f"Deleted derived directory: {derived_path}")
            except OSError as e:
                logger.error(f"Error deleting files for video {video.video_id}: {e}")
    else:
        # Just unlink videos from the game
        for link in video_links:
            db.session.delete(link)

    # Delete game assets
    paths = current_app.config['PATHS']
    game_assets_dir = paths['data'] / 'game_assets' / str(steamgriddb_id)
    if game_assets_dir.exists():
        try:
            shutil.rmtree(game_assets_dir)
            logger.info(f"Deleted game assets directory: {game_assets_dir}")
        except OSError as e:
            logger.error(f"Error deleting game assets for {steamgriddb_id}: {e}")

    # Delete game from database
    db.session.delete(game)
    db.session.commit()

    logger.info(f"Successfully deleted game {game.name}")
    return Response(status=200)

@api.after_request
def after_request(response):
    response.headers.add('Accept-Ranges', 'bytes')
    return response
