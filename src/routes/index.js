// src/routes/index.js

const express = require('express');
const healthRoutes = require('../modules/health/health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const usersRoutes = require('../modules/users/users.routes');
const followRoutes = require('../modules/follow/follow.routes');
const postsRoutes = require('../modules/posts/posts.routes'); 
const statusesRoutes = require('../modules/statuses/statuses.routes'); 
const sportsRoutes = require('../modules/sports/sports.routes'); 
const newsRoutes = require('../modules/news/news.routes');
const searchRoutes = require('../modules/search/search.routes');
const notificationsRoutes = require('../modules/notifications/notifications.routes');
const messagesRouter = require('../modules/messages/messages.routes');


const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/follow', followRoutes);
router.use('/posts', postsRoutes);
router.use('/statuses', statusesRoutes); 
router.use('/sports', sportsRoutes); 
router.use('/news', newsRoutes); 
router.use('/search', searchRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/messages', messagesRouter);


module.exports = router;