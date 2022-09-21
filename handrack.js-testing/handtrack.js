const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let trackButton = document.getElementById("trackbutton");
let updateNote = document.getElementById("updatenote");

let isVideo = false;
let model = null;
let showVideo = false;
let bubbleX = canvas.width / 2;
let bubbleY = canvas.height / 2;
const modelParams = {
    flipHorizontal: true,   // flip e.g for video  
    maxNumBoxes: 20,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.6,    // confidence threshold for predictions.
}

// starts video
function startVideo() {
    handTrack.startVideo(video).then(function (status) {
        console.log("video started", status);
        if (status) {
            updateNote.innerText = "Video started. Now tracking"
            isVideo = true
            // context.beginPath();
            // context.arc(95, 50, 40, 0, 2 * Math.PI);
            // // context.arc(predictions[0].bbox[0], predictions[0].bbox[1], 40, 0, 2 * Math.PI);
            // context.stroke();
            runDetection()
        } else {
            updateNote.innerText = "Please enable video"
        }
    });
}

// button to turn video on or off
function toggleVideo() {
    if (!isVideo) {
        updateNote.innerText = "Starting video"
        startVideo();
    } else {
        updateNote.innerText = "Stopping video"
        handTrack.stopVideo(video)
        isVideo = false;
        updateNote.innerText = "Video stopped"
        // model.dispose();
    }
}

function showVid() {
    showVideo = !showVideo
}


// runs the model
function runDetection() {
    model.detect(video).then(predictions => {
        console.log("Predictions: ", predictions);
        // model.renderPredictions(predictions, canvas, context, video);
        if (predictions.length != 0) {
            getMouseCoord(predictions, canvas, context, video);   
        }
        makeBubble(canvas, predictions);
        if (isVideo) {
            requestAnimationFrame(runDetection);
        }
    });
}

function getMouseCoord(predictions, canvas, context, mediasource){
    if (!showVideo){
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = mediasource.width;
        canvas.height = mediasource.height;
        // console.log("render", mediasource.width, mediasource.height);
        canvas.style.height =
        parseInt(canvas.style.width) *
            (mediasource.height / mediasource.width).toFixed(2) +
        "px";
        // console.log("render", canvas.style.width, canvas.style.height);

        context.save();
    }
    else{
        model.renderPredictions(predictions, canvas, context, video);
    }
    for (let i = 0; i < predictions.length; i++) {
        if (predictions[i].label != 'face'){
            context.beginPath();
            // context.arc(95, 50, 40, 0, 2 * Math.PI);
            context.arc(predictions[i].bbox[0], predictions[i].bbox[1], 5, 0, 2 * Math.PI);
            context.stroke();
        }
    }
}

function makeBubble(canvas, predictions) {
    for (let i = 0; i < predictions.length; i++) {
        if (predictions[i].label != 'face'){    
            if (Math.abs(predictions[i].bbox[0] - bubbleX) < 50 && bubbleX > 40 && bubbleX < canvas.width - 40 && Math.abs(predictions[i].bbox[1] - bubbleY) < 50 && bubbleY > 40 && bubbleY < canvas.height - 40){
                bubbleX = bubbleX + (10 * Math.sign((predictions[i].bbox[0] - bubbleX) * -1));
                bubbleY = bubbleY + (10 * Math.sign((predictions[i].bbox[1] - bubbleY) * -1));  
            }
        }
    }
    context.beginPath();
    context.arc(bubbleX, bubbleY, 40, 0, 2 * Math.PI);
    context.stroke();
}

function reset(){
    bubbleX = canvas.width / 2
    bubbleY = canvas.height / 2
}

// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});
