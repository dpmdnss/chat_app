require('dotenv').config();

var mongoose = require('mongoose');

mongoose.connect('mongodb+srv://dpmdnss:CM05P26S2001@cluster0.npawycj.mongodb.net/chat-app');

const app = require('express')();
const express = require('express');

const http = require('http').Server(app);

const userRoute = require('./routes/userRoute');
const User = require('./models/userModel');
const Chat = require('./models/chatModel');

app.use('/', userRoute);
app.use('/public', express.static('public'));

const io = require('socket.io')(http);

var usp = io.of('/user-namespace');

usp.on('connection', async function(socket){
   console.log('User Connected');

   var userID = socket.handshake.auth.token;
   
   await User.findByIdAndUpdate({_id: userID},{$set:{is_online:'1'}});

   // user broadcast online status
   socket.broadcast.emit('getOnlineUser', {user_id: userID});

   socket.on('disconnect', async function(){
      console.log('User Disconnected');
      await User.findByIdAndUpdate({_id: userID},{$set:{is_online:'0'}});
      // user broadcast offline status
      socket.broadcast.emit('getOfflineUser', {user_id: userID});
   });

   // chatting implementation
   socket.on('newChat', function(data){
      socket.broadcast.emit('loadNewChat', data);
   });

   // load old chats
   socket.on('existsChat', async function(data){
      var chats = await Chat.find({$or:[
         {sender_id: data.sender_id, receiver_id: data.receiver_id},
         {sender_id: data.receiver_id, receiver_id: data.sender_id},
      ]});
      socket.emit('loadChats', {chats:chats});
   });

   // delete chats
   socket.on('chatDeleted', function(id){
      socket.broadcast.emit('chatMessageDeleted', id);
   });

});

http.listen(3000, function(){
   console.log('Server is running');
});
