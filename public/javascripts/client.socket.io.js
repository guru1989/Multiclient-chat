$(document).ready(function() {
        var username = "anonymous";
        $('input[name=setUsername]').click(function(){
            if($('input[name=usernameTxt]').val() != ""){
                username = $('input[name=usernameTxt]').val();
                var msg = {type:'setUsername',user:username};
                socket.json.send(msg);
            }
            $('#username').slideUp("slow",function(){
                $('#sendChat').slideDown("slow");
            });
        });
        var socket = new io.connect('http://localhost:8080');
        var content = $('#content');


        socket.on("history",function(data){
        	content.append(data.text);
        });

 
        socket.on('connect', function() {
            console.log("Connected");
        });
 
        socket.on('message', function(message){
            content.append(message + '<br />');
        }) ;
 
        socket.on('disconnect', function() {
            console.log('disconnected');
            content.html("<b>Disconnected!</b>");
        });
 
        $("input[name=sendBtn]").click(function(){
            var msg = {type:'chat',message:username + " : " +  $("input[name=chatTxt]").val()}
            socket.json.send(msg);
            $("input[name=chatTxt]").val("");
        });
    });

