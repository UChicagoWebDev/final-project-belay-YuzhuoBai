create table users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(40) UNIQUE,
  password VARCHAR(40),
  api_key VARCHAR(40)
);

create table channels (
    id INTEGER PRIMARY KEY,
    name VARCHAR(40) UNIQUE
);

create table messages (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  channel_id INTEGER,
  body TEXT,
  replies_to INTEGER NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(channel_id) REFERENCES channels(id),
  FOREIGN KEY(replies_to) REFERENCES messages(id)
);

create table reactions (
  id INTEGER PRIMARY KEY,
  emoji VARCHAR(10),
  message_id INTEGER,
  user_id INTEGER,
  FOREIGN KEY(message_id) REFERENCES messages(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

create table user_message_views (
  user_id INTEGER,
  channel_id INTEGER,
  last_message_id INTEGER,
  PRIMARY KEY (user_id, channel_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(channel_id) REFERENCES channels(id),
  FOREIGN KEY(last_message_id) REFERENCES messages(id)
);