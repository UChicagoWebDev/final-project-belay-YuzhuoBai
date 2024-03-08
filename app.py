import logging
import string
import traceback
import random
import sqlite3
from datetime import datetime
from flask import * # Flask, g, redirect, render_template, request, url_for
from functools import wraps

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/belay.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None

def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/room')
@app.route('/room/<chat_id>')
@app.route('/room/<chat_id>/thread/<thread_id>')
def index(chat_id=None, thread_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404




# -------------------------------- API ROUTES ----------------------------------


# POST to sign up
@app.route('/api/signup', methods=['POST'])
def signUp():
    newUser = new_user()
    return jsonify({
        "user_id": newUser["id"],
        "user_name": newUser["name"],
        "api_key": newUser["api_key"],
    }), 200

# POST to log in
@app.route('/api/login', methods=['POST'])
def logIn():
    userName = request.json.get('userName')
    password = request.json.get('password')
    user = query_db('select * from users where name = ? and password = ?', [userName, password], one=True)
    if user:
        return jsonify({
        "user_id": user["id"],
        "user_name": user["name"],
        "api_key": user["api_key"],
    }), 200
    
    return jsonify({"error": "not login"}), 500


def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('Authorization')
        print("Received API Key:", api_key)
        if not api_key:
            return jsonify({"error": "API key required"}), 403
        user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
        print("User found:", user) 
        if not user:
            return jsonify({"error": "Invalid API key"}), 403
        return f(*args, **kwargs)
    return decorated_function

# POST to change the user's name
@app.route('/api/user/name', methods=['POST'])
@require_api_key
def update_username():
    data = request.json
    query_db('UPDATE users SET name = ? WHERE api_key = ?', [data['new_name'], request.headers.get('Authorization')])
    return jsonify({"message": "Username updated successfully"}), 200


# POST to change the user's password
@app.route('/api/user/password', methods=['POST'])
@require_api_key
def change_password():

    data = request.json
    query_db('UPDATE users SET password = ? WHERE api_key = ?', [data['new_password'], request.headers.get('Authorization')])
    return jsonify({"message": "Password updated successfully"}), 200

# create new room 
@app.route('/api/rooms/new', methods = ['POST'])
@require_api_key
def create_room():
    print("create room")
    
    name = "Unnamed Room " + ''.join(random.choices(string.digits, k=6))
    room = query_db('insert into channels (name) values (?) returning id', [name], one=True) 
    return jsonify({
        'id': room['id'],
        'name': name,
    }), 200

@app.route('/api/rooms', methods = ['GET'])
@require_api_key
def allRoom(): 
    user_id = get_userId_from_apiKey()
    
    if user_id is None:
        return jsonify({"error": "Invalid API Key"}), 403
    
    rooms = query_db(query = 'select * from channels')

    roomList = []
    for room in rooms:
        room_id = room["id"]
        
        # 获取用户在该房间已读的最后一条消息的ID
        user_last_viewed = query_db('''
            SELECT last_message_id
            FROM user_message_views
            WHERE user_id = ? AND channel_id = ?
        ''', [user_id, room_id], one=True)
        
        user_last_viewed_id = user_last_viewed['last_message_id'] if user_last_viewed else 0
        
        # 计算未读消息的数量
        unread_count = query_db('''
            SELECT COUNT(*)
            FROM messages
            WHERE channel_id = ? AND id > ?
        ''', [room_id, user_last_viewed_id], one=True)[0]
        
        room_info = {
            "room_id": room_id, 
            "room_name": room["name"],
            "unread_count": unread_count
        }
        roomList.append(room_info)

    return jsonify(roomList), 200

# get room name
@app.route('/api/rooms/<int:room_id>', methods = ['GET'])
@require_api_key
def getRoomName(room_id): 
    room = query_db('select * from channels where id = ?', [room_id], one = True)
    if room:
        theRoom = {"room_id": room["id"], "room_name": room["name"]}
        return jsonify(theRoom), 200
    return jsonify({"error": "Failed to get rooms"}), 500

    

# POST to change the name of a room
@app.route('/api/rooms/name', methods=['POST'])
@require_api_key
def change_room_name():
    data = request.json
    query_db('UPDATE channels SET name = ? WHERE id = ?', [data['new_name'], data['room_id']])
    return jsonify({"message": "Room name updated successfully"}), 200

# get all message in a room
@app.route('/api/rooms/<int:room_id>/messages', methods=['GET'])
@require_api_key
def get_messages(room_id):
    user_id = get_userId_from_apiKey()
    
    if user_id is None:
        return jsonify({"error": "Invalid API Key"}), 403

    messages = query_db('''
        SELECT
            messages.id,
            users.name as author,
            messages.body,
            messages.replies_to,
            COUNT(replies.id) as reply_count,
            replied_users.name as replied_author
        FROM messages
        JOIN users ON messages.user_id = users.id
        LEFT JOIN messages replies ON messages.id = replies.replies_to
        LEFT JOIN messages replied_messages ON messages.replies_to = replied_messages.id
        LEFT JOIN users replied_users ON replied_messages.user_id = replied_users.id
        WHERE messages.channel_id = ?
        GROUP BY messages.id
        ORDER BY messages.id ASC
    ''', [room_id])
    
    if messages is None:
        response = []
    else:
        response = [dict(msg) for msg in messages]
        
        if messages:
            last_message_id = messages[-1]['id']
            query_db('''
                INSERT INTO user_message_views (user_id, channel_id, last_message_id)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, channel_id)
                DO UPDATE SET last_message_id = excluded.last_message_id
            ''', [user_id, room_id, last_message_id])

    return jsonify(response), 200

# POST to post a new message to a room
@app.route('/api/rooms/<int:room_id>/messages', methods=['POST'])
@require_api_key
def post_message(room_id):
    data = request.json
    query_db('INSERT INTO messages (user_id, channel_id, body) VALUES (?, ?, ?)', [data['user_id'], room_id, data['body']])
    return jsonify({"message": "Message posted successfully"}), 200

def get_userId_from_apiKey():
    api_key = request.headers.get('Authorization')
    user = query_db('SELECT id FROM users WHERE api_key = ?', [api_key], one=True)
    if user:
        return user['id']
    return None

@app.route('/api/messages/<int:message_id>/thread', methods=['GET'])
@require_api_key
def get_thread(message_id):
    try:
        user_id = get_userId_from_apiKey()
        
        if user_id is None:
            return jsonify({"error": "Invalid API Key"}), 403

        parent_message = query_db('''
            SELECT
                messages.id,
                users.name as author,
                messages.body
            FROM messages
            JOIN users ON messages.user_id = users.id
            WHERE messages.id = ?
        ''', [message_id], one=True)

        if parent_message is None:
            return jsonify({"error": "Parent message not found"}), 404

        reply_messages = query_db('''
            SELECT
                messages.id,
                users.name as author,
                messages.body
            FROM messages
            JOIN users ON messages.user_id = users.id
            WHERE messages.replies_to = ?
            ORDER BY messages.id ASC
        ''', [message_id])

        response = {
            'parent_message': dict(parent_message) if parent_message else None,
            'reply_messages': [dict(msg) for msg in reply_messages] if reply_messages else []
        }

        return jsonify(response), 200
    except sqlite3.Error as e:
        print(f"Database error occurred: {e}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        print(f"Unexpected error occurred: {e}")
        traceback.print_exc()  # 打印详细的错误信息
        return jsonify({"error": "Unexpected error occurred"}), 500

@app.route('/api/rooms/<int:room_id>/messages/<int:message_id>/thread', methods=['POST'])
@require_api_key
def post_thread(room_id, message_id):
    data = request.json
    query_db('INSERT INTO messages (user_id, channel_id, body, replies_to) VALUES (?, ?, ?, ?)', 
             [data['user_id'], room_id, data['body'], message_id])
    return jsonify({"message": "Thread message posted successfully"}), 200

@app.route('/api/messages/<int:message_id>/reactions', methods=['POST'])
@require_api_key
def add_reaction(message_id):
    data = request.json
    query_db('INSERT INTO reactions (emoji, message_id, user_id) VALUES (?, ?, ?)',
             [data['emoji'], message_id, data['user_id']])
    return jsonify({"message": "Reaction added successfully"}), 200

@app.route('/api/reactions/<int:reaction_id>/users', methods=['GET'])
@require_api_key
def get_reaction_users(reaction_id):
    users = query_db('''
        SELECT users.id, users.name
        FROM reactions
        JOIN users ON reactions.user_id = users.id
        WHERE reactions.id = ?
    ''', [reaction_id])
    response = [dict(user) for user in users]
    return jsonify(response), 200

@app.route('/api/rooms/not_logged', methods = ['GET'])
# @require_api_key
def allRoom1():
#     user_id = get_userId_from_apiKey()

#     if user_id is None:
#         return jsonify({"error": "Invalid API Key"}), 403

  rooms = query_db('select * from channels')  # 获取所有房间的信息

  roomList = []
  for room in rooms:
      room_id = room["id"]  # 获取当前房间的ID

      # 直接获取房间的总消息数量
      total_messages_count = query_db('''
          SELECT COUNT(*)
          FROM messages
          WHERE channel_id = ?
      ''', [room_id], one=True)[0]  # 计算当前房间的消息总数

      room_info = {
          "room_id": room_id,
          "room_name": room["name"],
          "total_messages": total_messages_count  # 房间的总消息数量
      }
      roomList.append(room_info)  # 将房间信息添加到列表中

  return jsonify(roomList), 200  # 以JSON格式返回房间列表