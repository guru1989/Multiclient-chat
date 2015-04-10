var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var redis = require('redis');

var app = express();
var server = require("http").createServer(app);
var port = 8080;
server.listen(port);
console.log("Socket.io server listening at http://127.0.0.1:" + port);
var sio = require("socket.io").listen(server);


var routes = require('./routes/index');
var users = require('./routes/users');


var pub = redis.createClient();         // To create Publisher Client in Redis
var sub = redis.createClient();         // To create Subscriber Client in Redis
var history = redis.createClient();        // To store the chat messages in a queue for clients joining in middle of chat session
var store = redis.createClient();       // To store usernames and client id's as key value pairs in Redis


sio.sockets.on('connection', function (client) {

    // Send the list of chat messages in history to the client when it is connected for the first time.
    history.lrange("history",0,-1,function (err, result) {
    content="";
  
    result.forEach(function (item) {
        content+=item;
    });
    client.emit("history",{text:content});
});
    
    // Subscribe all clients to the channel "chatting".
    sub.subscribe("chatting");          
    sub.on("message", function (channel, message) {
        console.log("message received on server from publish ");
        client.send(message);
    });

    // Based on the type of messages received from clients i.e whether its a new chat message or new user logging in message,
    // these messages are published to the channel "chatting" and also added to the history queue.
    client.on("message", function (msg) {
        console.log(msg);
        if(msg.type == "chat"){
            history.rpush("history",msg.message+"<br />");
            pub.publish("chatting",msg.message);
        }
        else if(msg.type == "setUsername"){
            history.rpush("history","A new user in connected:" + msg.user+"<br />");
            pub.publish("chatting","A new user in connected:" + msg.user);
            store.set(client.id,msg.user);
        }
    });

    
    // To print the relevant message when client gets disconnected.
    client.on('disconnect', function () {
        store.get(client.id, function(err, value) {
            if (err) {
                console.error("error");
            } 
            else {
                pub.publish("chatting","User is disconnected: "+value);
                history.rpush("history","User is disconnected :" +value + "<br />");
            }
        });
    });
});


// To delete the history queue when server shuts down.
function exitHandler(options, err) {
    if (options.cleanup) history.del("history");
    if (err) history.del("history");
    if (options.exit){
        history.del("history")
     process.exit();
 }
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
