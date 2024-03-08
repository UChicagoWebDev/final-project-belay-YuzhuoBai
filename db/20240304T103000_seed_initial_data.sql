-- 向 users 表中插入初始数据
INSERT INTO users (name, password, api_key) VALUES ('Alice', 'alicepassword', 'aliceapikey');
INSERT INTO users (name, password, api_key) VALUES ('Bob', 'bobpassword', 'bobapikey');

-- 向 channels 表中插入初始数据
INSERT INTO channels (name) VALUES ('General');
INSERT INTO channels (name) VALUES ('Random');

-- 假设用户ID和频道ID按插入顺序生成（即 Alice 的 ID 为 1，Bob 的 ID 为 2；General 的 ID 为 1，Random 的 ID 为 2）

-- 向 messages 表中插入初始数据
-- Alice 在 General 频道发送消息
INSERT INTO messages (user_id, channel_id, body) VALUES (1, 1, 'Hello, everyone!');
-- Bob 在 Random 频道回复
INSERT INTO messages (user_id, channel_id, body) VALUES (2, 2, 'What''s up?');

-- 向 reactions 表中插入初始数据
-- 假设 Alice 对 Bob 的消息做了笑脸反应（假设该消息的ID为 2）
INSERT INTO reactions (emoji, message_id, user_id) VALUES ('😊', 2, 1);

-- 向 user_message_views 表中插入初始数据
-- 假设 Alice 和 Bob 都看到了他们所在频道的最后一条消息
INSERT INTO user_message_views (user_id, channel_id, last_message_id) VALUES (1, 1, 1); -- Alice 在 General
INSERT INTO user_message_views (user_id, channel_id, last_message_id) VALUES (2, 2, 2); -- Bob 在 Random
