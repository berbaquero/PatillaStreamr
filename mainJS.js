SC.initialize({
    client_id: "cdd84eeac81a4a84affc3200e55d7cd2",
});

$(document).ready(function () {

    var clientID;
    var playingSong; // The Sound object instance of the now-playing song.
    var songDuration;
    var songInitLimit = 2500;
    var currentPosition;
    
    var timerID;

    var songsQueue = [];

    var tracksTemplate = "<div class='track' style=\"background-image: url('{{artwork_url}}');\"><p class='resultTitle'>{{title}}<span class='resultArtist'> - {{user.username}}</span><a class='qLink' href='#'>+++</a></p></div>";

    var artistTemplate = "<div id='artistInfo'><h2 class='resultTitle'>{{username}}</h2><p><b>{{city}} - {{country}}</b></p><p>{{description}}</p><a href='{{permalink_url}}' target='_black'>SoundCloud</a></div>";

    var queueTemplate = "<p class='queued'><b>{{title}}</b> - {{user.username}}</p>";
    

    SC.whenStreamingReady(function(){
        clientID = "cdd84eeac81a4a84affc3200e55d7cd2";
        status("Listo para usar...");
    });
    
    var tick = function() {
        currentPosition = playingSong.position;
        var secs = (currentPosition / 1000) % 60;
        var mins = (currentPosition / (1000 * 60));
        secs = Math.floor(secs);        
        $("#timer").html(Math.floor(mins) + "." + (secs < 10 ? "0" + secs : secs));
    }
    
    var startTimer = function () {
        timerID = setInterval(tick, 1000);
    }
    
    var pauseTimer = function () {
        clearInterval(timerID);
    }

    $("#about").click( function() {
        $("div.hero-unit").fadeIn();
        return false;
    });

    $("#mainSearchField").keyup( function(e) {
        if(e.keyCode == 13) {
            mainSearch();
        }
        return false;
    });

    // Evitar que al presionar enter el browser haga un request. 
    $('form').submit(function(e) {
        e.preventDefault();
    });

    var status = function(message) {
        $("#status p").text(message);
    };
    
    var mainSearch = function() {
        var query = $("#mainSearchField").val();
        if(query) {
            if($("div.hero-unit").css("display") != 'none') { // Si se está mostrando el mensaje inicial
                $("div.hero-unit").fadeOut(); // Quitarlo
            }

            // Limpiar resultados previos
            $("#artistsResults").empty();
            $("#searchResults").empty();

            // Realizar la búsqueda de canciones
            var url = "https://api.soundcloud.com/tracks.json?q=" + query + "&limit=10&client_id=" + clientID;
            $.getJSON(url, function(data) {
                $("#searchResults").removeClass("oculta");
                $.each(data, function(i, track) {
                    insertResultRow(track);
                /*insertResultRow(track.id, track.title, track.artwork_url, track.user.id,
                        track.user.username, track.duration);*/
                });
            });

            // Realizar búsqueda de artistas
            var url1 = "https://api.soundcloud.com/users.json?q=" + query + "&limit=10&client_id=" + clientID;
            $.getJSON(url1, function(data) {
                $("#artistsResults").removeClass("oculta");                
                $.each(data, function(i, artist) {
                    insertArtistResult(artist);
                });
            });
        }        
    };

    var insertResultRow = function(track) {
        var artwork = track.artwork_url;
        track['artwork_url'] = artwork ? artwork.replace("large","small") : "";
        var html = Mustache.to_html(tracksTemplate, track);
        $(html).data("track", track).appendTo($("#searchResults"));
    };

    var insertArtistResult = function(artist) {
        if(artist.avatar_url.indexOf("default") === -1) {  // Solo se muestran si tienen avatar...
            // Mostrar resultado y guardar modelo
            $("<div />").addClass("artist")
            .css("background-image", "url('" + artist.avatar_url + "')").append($("<p />")
                .html(artist.full_name ? artist.full_name : artist.username))
            .data("artist", artist)
            .appendTo($("#artistsResults"));
        }
    };

    var searchArtistTracks = function(artistID, artistName) {
        $("#searchResults").empty();
        var url = "https://api.soundcloud.com/users/" + artistID +"/tracks.json?client_id=" + clientID;
        $.getJSON(url, function(data) {
            $.each(data, function(i, track) {
                insertResultRow(track);
            });
        });
    };

    // Al hacer doble click sobre un resultado de artista
    $(".artist").live("dblclick", function() {
        var selected = this;
        var artist = $(this).data("artist");
        // Mostrar las pistas del artista seleccionado
        searchArtistTracks(artist.id, artist.full_name);
        // Quitar a los otros resultados, y dejar sólo al artista seleccionado
        $("#artistsResults").empty();        
        $(selected).appendTo($("#artistsResults"));

        var html = Mustache.to_html(artistTemplate, artist);
        $(selected).data("artist", artist);
        $("#artistsResults").append(html);
        $("#artistInfo").fadeIn();
    // Mostrar info del artista seleccionado
    });

    $("#btnSearch").click( function() {
        mainSearch();
    });

    // Al hacer doble click sobre un resultado de canción
    $("div.track").live("dblclick", function() {
        var track = $(this).data("track");
        playSong(track.id, track.artwork_url, track.title, track.user.username, track.duration);
    });

    var getAndPlayTrack = function(idTrack) {
        var url = "https://api.soundcloud.com/tracks/" + idTrack + ".json?client_id=" + clientID;
        $.getJSON(url, function(track) {
            playSong(track.id, track.artwork_url, track.title, track.user.username, track.duration);
        });
    };

    var playNextSong = function() {
        if(songsQueue.length > 0) {
            getAndPlayTrack(songsQueue.shift());
            $("#queue p:first").remove();
        }
    };

    var playSong = function(idTrack, coverURL, title, artistName, duration) {
        $("#nowPlaying").empty();
        $("#songInfo").empty();      
        if (playingSong) { // Si hay alguna canción cargada
            pauseTimer();
            playingSong.destruct(); // destruirla, para liberar memoria y eso
        }
        // Obtener nueva canción
        playingSong = SC.stream(idTrack, {
            onfinish : function() {
                $("#btnPlay i").removeClass("icon-pause").addClass("icon-play");
                $('title').html("Patilla Beats");
                pauseTimer();
                playNextSong();
            },
            onplay : function() {
                $("#btnPlay i").removeClass("icon-play").addClass("icon-pause");
                $('title').html('"' + title + '" de ' + artistName + ' / Patilla Stream');                
                startTimer();                
            },
            onpause : function() {
                $("#btnPlay i").removeClass("icon-pause").addClass("icon-play");
                pauseTimer();
            },
            onstop : function() {
                $("#btnPlay i").removeClass("icon-pause").addClass("icon-play");
                pauseTimer();
            },
        });
        playingSong.play(); // Comenzar a reproducirla
        // Determinar la duration en minutos y segundos
        var secs = (duration / 1000) % 60;
        var mins = (duration / (1000 * 60));
        secs = Math.floor(secs);
        songDuration = Math.floor(mins) + "." + (secs < 10 ? "0" + secs : secs);

        showSongInfo(coverURL, title, artistName, songDuration);
    };

    var showSongInfo = function(coverURL, title, artistName, duration) {
        if(coverURL.indexOf("small") >= 0) { // Si tiene 'small'
            coverURL = coverURL.replace("small", "t300x300");
        }
        if(coverURL.indexOf("large") >= 0) { // Si tiene 'large'
            coverURL = coverURL.replace("large", "t300x300");
        }
        $("#nowPlaying")
        .css("background-image", "url('" + (coverURL ? coverURL : "empty.png") + "')");
        $("<p />").html("<b>" + title + "</b>").appendTo($("#songInfo"));
        $("<p />").html(artistName).appendTo($("#songInfo"));
        
        $("<div />").attr("id", "duration")
        .append($("<span />").attr("id", "timer"))
        .append($("<span />").html("<b>/ " + duration + "</b>"))
        .appendTo($("#songInfo"));
    };
    
    var togglePauseSong = function(currentSong) {
        currentSong.togglePause();
    };

    var rewind = function(currentSong) {
        if(currentSong.position <= songInitLimit) { // Si va comenzando
            // Pasar a canción anterior
            status("Pasar a canción anterior - Por implementar");
        } else { // Si ya pasó del comienzo
            currentSong.setPosition(0); // Devuelve la canción al comienzo
            $("#timer").html("0.00");
        }
    };

    $("#btnPlay").click( function() {
        togglePauseSong(playingSong);
    });

    $("#btnRewind").click( function() {
        rewind(playingSong);
    });

    $("#btnForward").click( function(){
        playNextSong();
    });

    $("a.qLink").live("click", function(e) {
        e.preventDefault();
        var track = $(this).parent().parent().data("track");
        addToSongQueue(track);
        console.log(songsQueue);
    });

    var addToSongQueue = function(newTrack) {
        var track = newTrack;
        songsQueue.push(track.id);
        var html = Mustache.to_html(queueTemplate, track);
        $("#queue").append(html);
    }

    // Sobre el tamaño dinámico de la sección de Queue / Playlist

    var calculateQueueHeight = function() {
        $("#queue").css("height", $(window).height() - $("#player").height() - 110);
    }

    $(window).on("resize", function(){
        calculateQueueHeight();
    });
    
    $("#queue").hover(function(){
        $(this).css("overflow-y", "auto");
    }, function(){
        $(this).css("overflow-y", "hidden");
    });

    calculateQueueHeight();
});