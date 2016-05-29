var renderer, scene, container, effect, camera, video, canvasVideo, canvasVideoContext, canvasWidth, canvasSnapshot, canvasSnapshotContext, overlayCanvas, canvasTemp, texture, cameraMesh, cameraPlane, trackingEvent, current_status, is_saved_face, username = "searching..."
    , canvasHeight
    , $top_bar_username
    , $top_bar_status_icon
    , $top_bar_status_icon_title
    , $body
    , headTrackingEvent
    , cube;

init();


function init() {


    // DOM elements
    $top_bar_username = document.getElementById("top-bar-list-name-data");
    $top_bar_status_icon = document.getElementById("top-bar-status-icon-loading");
    $top_bar_status_icon_title = document.getElementById("top-bar-status-icon-loading-title");
    $body = document.body;

    scene = new THREE.Scene();

    /* 
        PerspectiveCamera(fov, aspect, near, far)
        
        fov – the vertical field of view for the camera. Ours is set to 90 degrees which means we’ll see up and down at about 90 degrees whilst looking around. 
        aspect – the aspect ratio for the camera. It is commonly set to be the width divided by the height of the viewport. Google has set it to 1 in one of their examples I’ve seen and that seemed to work too.  
        near and far – any elements that are between the near and far values from our camera are rendered.        
        source: https://www.sitepoint.com/bringing-vr-to-web-google-cardboard-three-js/
    */

    camera = new THREE.PerspectiveCamera(90, .2, 0.001, 600);
    camera.position.set(0, 0, 10);
    camera.lookAt(scene.position);
    scene.add(camera);

    var pointLight = new THREE.PointLight( 0xffffff, 1, 100 );
    pointLight.position.set( 10, 10, 10 );

    scene.add(pointLight);    
    
    if (Detector.webgl) {

        renderer = new THREE.WebGLRenderer({
            antialias: true
        });

    } else {

        renderer = new THREE.CanvasRenderer();
    }


    container = document.getElementById("webglcanvas");

    container.appendChild(renderer.domElement);

    // VR stereoscopic view

    /* 
        In order to have our VR stereoscopic view, we pass our renderer through the StereoEffect object that we imported in earlier in StereoEffect.js.
        source: https://www.sitepoint.com/bringing-vr-to-web-google-cardboard-three-js/
        
    */

    effect = new THREE.StereoEffect(renderer);

    /* ==========================================================================
   :Camera Feed
   ========================================================================== */

    video = document.createElement('video');
    video.setAttribute('autoplay', true);

    var options = {
        video: {
            optional: [{
                facingMode: "environment"
            }]
        }
    }

    /* 
    
        Our next step is to actually pull in our camera feed using these options. For this, we use the MediaStream API. This is a set of JavaScript APIs that allow us to pull in data from local audio and video streams – perfect for getting our phone’s camera stream. In particular, we’ll be using the getUserMedia function. The MediaStream API is still in “W3C Editor’s Draft” and is implemented slightly differently browser to browser. This demo is focused mainly on Google Chrome for mobile but for future compatibility sake, we get the one that works with our user’s current browser and assign it to navigator.getUserMedia:

        source: https://www.sitepoint.com/filtering-reality-with-javascript-google-cardboard/
    
    */

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    if (typeof MediaStreamTrack === 'undefined' && navigator.getUserMedia) {

        alert('This browser doesn\'t support this demo :(');

    } else {

        /* 
        
            Get our camera data!  

            in future, use navigator.mediaDevices.getUserMedia instead of MediaStreamTrack.getSources
            https://developers.google.com/web/updates/2015/10/media-devices?hl=en
        
        */


        MediaStreamTrack.getSources(function (sources) {

            for (var i = 0; i < sources.length; ++i) {
                var source = sources[i];
                if (source.kind === 'video') {
                    if (source.facing && source.facing == "environment") {
                        options.video.optional.push({
                            'sourceId': source.id
                        });
                    }
                }
            }

            navigator.getUserMedia(options, streamFound, streamError);
        });

    }


    function streamFound(stream) {


        video.src = URL.createObjectURL(stream);
        video.style.width = '100%';
        video.style.height = '100%';

        video.play();


        // creating canvas for manipulating the video stream

        canvasVideo = document.createElement('canvas');

        canvasVideo.width = nextPowerOf2(container.offsetWidth);
        canvasVideo.height = nextPowerOf2(container.offsetHeight);

        canvasVideoContext = canvasVideo.getContext('2d');

        // creating a texture with the canvas/video feed, then add it to the cameraPlane

        texture = new THREE.Texture(canvasVideo);
        texture.context = canvasVideoContext;

        cameraPlane = new THREE.PlaneGeometry(1920, 1280);

        cameraMesh = new THREE.Mesh(cameraPlane, new THREE.MeshBasicMaterial({
            color: 0xffffff
            , opacity: 1
            , map: texture
        }));

        cameraMesh.position.z = -600;

        scene.add(cameraMesh);


        // creating canvas for video snapshot

        canvasSnapshot = document.createElement('canvas');
        canvasSnapshot.width = nextPowerOf2(640);
        canvasSnapshot.height = nextPowerOf2(480);

        canvasSnapshotContext = canvasSnapshot.getContext('2d');

        // creating temp canvas for head tracking

        canvasTemp = document.createElement('canvas');
        canvasTemp.width = 640;
        canvasTemp.height = 480;

        faceTrackingInit();
        
        // create and prepare cube, but do not add to the scene, that we will do on tracking events

	   var snmCubeMaterial = new THREE.MeshPhongMaterial( { map: new THREE.ImageUtils.loadTexture( 'img/logo_original.png' ) } );
        var geometry = new THREE.BoxGeometry(3, 3, 3, 4, 4, 4);
        var material = new THREE.MeshLambertMaterial({
            color: 0xFFFFFF
            , transparent: true
            , opacity: .8
            , overdraw: .5
            , wireframe: false
        });
        cube = new THREE.Mesh(geometry, snmCubeMaterial);        
        

    }

    function streamError() {}

    /* ==========================================================================
       :End Camera Feed
       ========================================================================== */



    drawVideo();


}

document.getElementById("button").addEventListener("click", function () {

    saveSnapshot();

});




function faceTrackingInit() {


    var htracker = new headtrackr.Tracker({
        ui: false
        , headPosition: true
        , calcAngles: true
    });
    htracker.init(video, canvasTemp, false);
    htracker.start();

}


document.addEventListener("facetrackingEvent", function (event) {

    // once we have stable tracking, draw rectangle
    if (event.detection == "CS") {

        trackingEvent = event;

    }


});


document.addEventListener("headtrackingEvent", function (event) {
    
    headTrackingEvent = event;

});


document.addEventListener('headtrackrStatus', function (event) {
   
        console.log(event.status);

        if (event.status == "found") {

            if (current_status != "found" && !is_saved_face && username == "searching...") {

                // do a new lookup

                //draw_data();

                $("#button").trigger("click");

                current_status = "found";
                is_saved_face = true;

                console.log("found");
            }

        }

        if (event.status == "redetecting" && current_status != "lost") {

            current_status = "lost";
            is_saved_face = false;


            username = "searching...";

            console.log("lost");

        }


    }

);


function draw_tracking_rectangle() {


    scene.remove( scene.getObjectByName(cube.name) );

    var ratio = canvasVideo.width / canvasTemp.width;
    var ratioH = canvasVideo.height / canvasTemp.height;
    
    
    /* 60 as 60 cm is a chosen standard distance between a camera and head when everything will be scaled to 1 */
    var z = (headTrackingEvent.z / 60);
    
 
    canvasVideoContext.translate(trackingEvent.x, trackingEvent.y)
    //canvasVideoContext.rotate(trackingEvent.angle - (Math.PI / 2));
    canvasVideoContext.strokeStyle = 'rgba(255,255,255,0.8)';
    canvasVideoContext.lineWidth = "5";
    canvasVideoContext.strokeRect((trackingEvent.x - trackingEvent.width) * ratio, (trackingEvent.y - trackingEvent.height) * ratioH, trackingEvent.width * ratio, (trackingEvent.height * ratioH));
    //canvasVideoContext.rotate((Math.PI / 2) - trackingEvent.angle);
    canvasVideoContext.translate(-trackingEvent.x, -trackingEvent.y);
    canvasVideoContext.font = (24 / z) * ratio + "px arial";
    canvasVideoContext.fillText(username, (trackingEvent.x - trackingEvent.width / 2) * ratio, (trackingEvent.y - trackingEvent.height / 2) * ratioH);

    
    cube.position.x = ( ( (trackingEvent.x - trackingEvent.width ) * ratio ) / 100 ) - 10; 
    cube.position.y = - ( (trackingEvent.y - trackingEvent.height / 1) * ratioH / 100 ) ;
    
    var normalizedZ = function(z) {
    
       var _getSign = (z < 1) ? 1 : -1;    
       var _normZ = Math.abs(z - 1) * 10 * _getSign;  
        
       // cut off higher of lower values    
       if (_normZ > 15) {
           
           _normZ = 15
           
       }
        
       if (_normZ < -20) {
           
           _normZ = -20
           
       } 
        
       return _normZ;    
        
    }
   
    
    cube.position.z = normalizedZ(z);
    
  
    //cube.rotation.x = (Math.PI / 2) - trackingEvent.angle;
    cube.rotation.y = (Math.PI / 2) + trackingEvent.angle;
    
    cube.name = "cube_snm";
 
    scene.add(cube);    
    

}


function update_DOM_elements() {


    $top_bar_username.innerHTML = username;

    if (current_status === "found") {

        $body.className = " ";

    } else {

        $body.className = "loading";

    }


}


function saveSnapshot() {

    if (canvasSnapshotContext) {


        canvasSnapshotContext.drawImage(video, 0, 0, 640, 480);

        var URI = canvasSnapshot.toDataURL();
        var file = dataURItoBlob(URI);


        var fd = new FormData();
        // Append our Canvas image file to the form data
        fd.append("files", file);
        fd.append("album", "stunome_vrni");
        fd.append("albumkey", "183a13952adbd5d998aaca63efc100f6b0ab7f82b861dcc7293e86cb161f8a02");
        // And send it
        $.ajax({
            url: "https://lambda-face-recognition.p.mashape.com/recognize"
            , type: "POST"
            , data: fd
            , processData: false
            , contentType: false
            , beforeSend: function (xhr) {
                xhr.setRequestHeader("X-Mashape-Authorization", "cwkIDLokcrmshAeMcvfjQugmpwZ8p1nwchwjsnUxiMorcBvlCC");
            }
        }).done(function (result) {
            console.log("Received response..");
            var resultObject = JSON.stringify(result);
            console.log(resultObject);

            if (JSON.parse(resultObject).photos[0].tags.length > 0) {

                username = JSON.parse(resultObject).photos[0].tags[0].uids[0].prediction;

                is_saved_face = true;

            } else {

                username = "searching...";

                current_status = "lost";

                is_saved_face = false;

            }



        });


    }


}

function drawVideo() {

    if (canvasVideoContext) {

        canvasVideoContext.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);

        if (trackingEvent && headTrackingEvent) {

            draw_tracking_rectangle();

        }

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            texture.needsUpdate = true;
        }


        update_DOM_elements();

    }


    requestAnimationFrame(drawVideo);


    update();
    render();
}


function update(dt) {
    resize();
    camera.updateProjectionMatrix();
}

function render() {

    renderer.render(scene, camera);

}


function resize() {

    var width = container.offsetWidth;
    var height = container.offsetHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    //effect.setSize(width, height);

}

window.addEventListener('click', function () {

    if ($body.requestFullscreen) {
        $body.requestFullscreen();
    } else if ($body.msRequestFullscreen) {
        $body.msRequestFullscreen();
    } else if ($body.mozRequestFullScreen) {
        $body.mozRequestFullScreen();
    } else if ($body.webkitRequestFullscreen) {
        $body.webkitRequestFullscreen();
    }

}, false);

function nextPowerOf2(x) {
    return Math.pow(2, Math.ceil(Math.log(x) / Math.log(2)));
}

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);
    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], {
        type: mimeString
    });
}