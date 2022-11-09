const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let trackButton = document.getElementById("trackbutton");
let updateNote = document.getElementById("updatenote");
canvas.style.background = "black";
canvas.width = 1500;
canvas.height = 750;

let isVideo = false;
let model = null;
let showVideo = false;
const modelParams = {
    flipHorizontal: true,   // flip e.g for video  
    maxNumBoxes: 7,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.65,    // confidence threshold for predictions.
};

let levelOne = true;
let levelTwo = false;

const hand = {
    x: 0,
    y: 0,
    height: 0,
    width: 0,
    sinceConfirmed: 0,
    ID:0,
}

// ====================================
// LEVEL ONE global vars
let bubbleX = canvas.width / 2;
let bubbleY = canvas.height / 2;
let totalCircles = 5;
let circlesLeft = totalCircles;
let defaultSpeed = 100;
let radiusOfAttraction = 275;
let countCirclesNearHand = 0;
// using JavaScript built in hash table Map
const localPred = new Map();
const circleList = [];
const circle = {
    isVisible : true,
    xCoords: canvas.width / 2,
    yCoords: canvas.height / 2,
    nearHand: false,
    radius: 40,
    yVelocity: defaultSpeed,
    xVelocity: defaultSpeed,
    r: 255,
    g: 165,
    b: 0,
    a: 1, 
    readyToLaunch: false,
    launching: false,
    // getNextCoords : function(){
    //     console.log(`My name is ${this.name}. Am I
    //       studying?: ${this.isStudying}.`)
    // }
};

//========================================
// LEVEL TWO global vars
//var tri = new Trianglify();
const trianglify = window.trianglify;
const options = {height: canvas.height, width: canvas.width, cellSize: 300,};
var pattern = trianglify(options);
console.log(pattern instanceof trianglify.Pattern); // true
const edgeList = new Map();
var frozenEdges = 0;
const edge = {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    poly: 0,
    left: 0,
    right: 0, 
    m: 0, 
    b: 0,
    xcur: 0,
    length: 0,
    velocity: 10,
    frozen: true,
}

function end(){
    model.dispose();
    showVid();
}

// starts video
function startVideo() {
    handTrack.startVideo(video).then(function (status) {
        console.log("video started", status);
        if (status) {
            updateNote.innerText = "Video started. Now tracking";
            isVideo = true;
            // context.beginPath();
            // context.arc(95, 50, 40, 0, 2 * Math.PI);
            // // context.arc(predictions[0].bbox[0], predictions[0].bbox[1], 40, 0, 2 * Math.PI);
            // context.stroke();
            reset();
            runDetection();
        } else {
            updateNote.innerText = "Please enable video";
        }
    });
}

function getFPS(){
    //console.log(model.getFPS);
    // frames per second
    return model.getFPS();
}

function startGame() {
    // mapped to button in HTML
    toggleVideo();
}

function toggleVideo() {
    // button to turn video on or off
    if (!isVideo) {
        updateNote.innerText = "Starting video";
        startVideo();
    } else {
        updateNote.innerText = "Stopping video";
        handTrack.stopVideo(video);
        isVideo = false;
        updateNote.innerText = "Video stopped";
        // model.dispose();
    }
}

function showVid() {
    showVideo = !showVideo;
}

function switchLevel(){
    levelOne = !levelOne;
    levelTwo = !levelTwo;
    reset();
}

// runs the model
function runDetection() {
    model.detect(video).then(predictions => {
        //console.log("Predictions: ", predictions);
        // model.renderPredictions(predictions, canvas, context, video);
        if (predictions.length != 0) {
            getMouseCoord(predictions, canvas, context, video);   
        }
        updateLocalPred(predictions, video, canvas);
        updateFrame(canvas, predictions, video);
        if (isVideo) {
            requestAnimationFrame(runDetection);
        }
    });
}

function getMouseCoord(predictions, canvas, context, mediasource){
    if (!showVideo){
        context.clearRect(0, 0, canvas.width, canvas.height);
        // console.log("render", mediasource.width, mediasource.height);
        canvas.style.height =
        parseInt(canvas.style.width) *
            (mediasource.height / mediasource.width).toFixed(2) +
        "px";
        // console.log("render", canvas.style.width, canvas.style.height);
        context.save();
    }
    else{
        canvas.width = mediasource.width;
        canvas.height = mediasource.height;
        model.renderPredictions(predictions, canvas, context, video);
    }
}

function updateFrame(canvas, predictions, video){
    // clears canvas each frame and switches between levels also creates small circles
    context.clearRect(0, 0, canvas.width, canvas.height);
    makeSmallCircles(predictions, video, canvas);
    if (levelOne){
        canvas.style.background = "black";
        getNewCircleCoords(canvas, predictions, video);
        if (circleList.length == 0){
            switchLevel();
        }
    } else if (levelTwo) {
        moveLines();
        if (frozenEdges == placeholder.length){
            switchLevel();
        }
        //displayTriangles();
        // canvas.style.background = `rgba(
        //     65,
        //     105,
        //     225, 
        //     1)`;
    }
}

function translateCoords(vidCoordsX, vidCoordsY, mediasource, canvas){
    // translates vid coords into canvas coords
    var x = vidCoordsX / mediasource.width * canvas.width;
    var y = vidCoordsY / mediasource.height * canvas.height;
    return [x, y];
}

// =======================================
// HANDTRACKING HELPER METHODS
function updateLocalPred(predictions, mediasource, canvas){
    // used to track hands across frames
    if (predictions.length > 1){
        for (let i = 0; i < predictions.length; i++){
            if (predictions[i].label != 'face'){
                // create new hand object
                //  [xy]--------*
                //  |           |
                //  |           |
                //  |           |
                //  *---------[xy]
                newHand = Object.create(hand);
                coords1 = translateCoords(predictions[i].bbox[0], predictions[i].bbox[1], mediasource, canvas);
                coords2 = translateCoords(predictions[i].bbox[2], predictions[i].bbox[3], mediasource, canvas);
                
                newHand.height = Math.abs(coords2[1] - coords1[1]);
                newHand.width = Math.abs(coords2[0] - coords1[0]);
                linex = getLine(0, 0, canvas.width, newHand.width);
                liney = getLine(0, 0, canvas.height, newHand.height);
                //console.log(linex);
                // DOUBLE CHECK THIS TODO
                // centerx = coords1[0] + (newHand.width/2);
                // if (coords1[0] < (canvas.width - newHand.width / 2)){

                // } else if (coords1[0] )
                newHand.x = coords1[0] + ((linex[0] * coords1[0]) + linex[1]);
                newHand.y = coords1[1] + ((liney[0] * coords1[1]) + liney[1]);
                newHand.sinceConfirmed = 0;
                newHand.ID = Math.random();
                mostLikely = 0;
                prevPercent = 0;
                // compare new hand with old hands
                for (let [key, value] of localPred){
                    probability = probabilityOfMatch(value, newHand);
                    if (probability > prevPercent){
                        mostLikely = key;
                        prevPercent = probability;
                    }
                    if (i == predictions.length - 1){
                        // we are at the last iteration, let's increase sinceConfirmed
                        value.sinceConfirmed = value.sinceConfirmed + 1; 
                    }
                    if (value.sinceConfirmed > 5){
                        // how many frames it's been gone.
                        localPred.delete(key);
                    }
                }
                // replace the object with updated info if it is likely related
                if (prevPercent > 75){
                    newHand.ID = mostLikely;
                    localPred.set(mostLikely, newHand);
                }
                else{
                    // if it's not related to anything, we'll add it
                    localPred.set(newHand.ID, newHand);
                }
            }
        }
    }else {
        localPred.clear();
    }
}

function probabilityOfMatch(old, cur){
    // returns the probability that the hand is the same from frame to frame based on several factors
    if (old.ID == cur.ID){
        return 100;
    }
    probability = 100;
    probability = probability - Math.abs(old.x - cur.x);
    probability = probability - Math.abs(old.y - cur.y);
    probability = probability - Math.abs(old.width - cur.width);
    probability = probability - Math.abs(old.height - cur.height);
    probability = probability - old.sinceConfirmed;
    return probability;
}

function makeSmallCircles(){
    for (let [key, value] of localPred) {
        if (levelOne){
            context.strokeStyle = `rgba(255, 255, 255, 1)`;
        } else {
            context.strokeStyle = `rgba(255, 255, 255, 1)`;
        }
        context.beginPath();
        // context.arc(95, 50, 40, 0, 2 * Math.PI);
        //coords = translateCoords(predictions[i].bbox[0], predictions[i].bbox[1], mediasource, canvas)
        context.arc(value.x, value.y, 5, 0, 2 * Math.PI);
        context.stroke();
    }
}

//================================================
// MISC HELPER METHODS
function getLine(x1, y1, x2, y2){
    m = (y2 -y1)/(x2 -x1);
    b = (y1 - (m*x1));
    return [m, b];
}

// function returnY(x, m, b){
//     return m*x + b;
// }

function testFunc(){
    //countCirclesNearHand = 75;
    showVid();
}

function reset(){
    localPred.clear();
    if (levelOne){
        initCircles();
        countCirclesNearHand = 0;
        circlesLeft = totalCircles;
    } else if (levelTwo){
        placeholder = [];
        pattern = trianglify(options);
        console.log(pattern instanceof trianglify.Pattern); // true
        generateTriangles(canvas);
        frozenEdges = 0;
    }
}

function getRandomSign(){
    if (Math.random() > 0.5){
        sign = 1;
    }else{
        sign = -1;
    }
    return sign;
}

// ================================================
// LEVEL ONE
function initCircles() {
    bubbleRadius = 20; //(canvas.width / (totalCircles - 5)) / 1.5;
    for (let i = 0; i < totalCircles; i++){
        circleList[i] = Object.create(circle);
        circleList[i].xCoords = Math.floor(Math.random() * canvas.width);
        circleList[i].yCoords = Math.floor(Math.random() * canvas.height);
        circleList[i].radius = bubbleRadius;
        circleList[i].xVelocity = ((Math.random() * defaultSpeed * 2) - defaultSpeed) / getFPS();
        console.log(circleList[i].xVelocity);
        circleList[i].yVelocity = ((Math.random() * defaultSpeed * 2)- defaultSpeed) / getFPS();
    }
}

function setCircleColor(circle){
    if (circle.launching){
        circle.r = 255;
        circle.g = 0;
        circle.b = 0;
    } else if (circle.nearHand != -1){
        circle.r = 0;
        //circle.g = 255;
        //circle.b = 0;
        if (circle.xVelocity >= circle.yVelocity){
            // 10-50 yellow 255, 255, 0; green 0, 255, 0
            // 50 -> 255, 10 -> 0
            gline = getLine(0, 0, 30, 255);
            circle.g = (circle.xVelocity * gline[0]) + gline[1];
            // 50 -> 0, 10 -> 255
            bline = getLine(0, 255, 30, 0);
            circle.b = (circle.xVelocity * bline[0]) + bline[1];
        } else{
            // 50 -> 255, 10 -> 0
            gline = getLine(0, 0, 30, 255);
            circle.g = (circle.yVelocity * gline[0]) + gline[1];
            // 50 -> 0, 10 -> 255
            bline = getLine(0, 255, 30, 0);
            circle.b = (circle.yVelocity * bline[0]) + bline[1];
        }
    } else {
        circle.r = 255;
        circle.g = 255;
        circle.b = 255;
    }
}

function getNewCircleCoords(canvas, predictions, mediasource){
    //countCirclesNearHand = 0;
    for (let j = 0; j < circleList.length; j++) {
        if (circleList[j].xCoords > circleList[j].radius){
            onLeft = false;
        }else{
            onLeft = true;
        } 
        if (circleList[j].xCoords < canvas.width - circleList[j].radius){
            onRight = false;
        }
        else{
            onRight = true;
        }
        if (circleList[j].yCoords > circleList[j].radius){
            onBottom = false;
        } else{
            onBottom = true;   
        }    
        if (circleList[j].yCoords < canvas.height - circleList[j].radius){
            onTop = false;
        } else {
            onTop = true;
        }
        circleList[j].nearHand = -1;
        if (localPred.size > 0 && !circleList[j].launching){
            for (let [key, value] of localPred) {
                //var convertedCoords = translateCoords(value.bbox[0], value.bbox[1], mediasource, canvas);
                var xDist = value.x - circleList[j].xCoords;
                var yDist = value.y - circleList[j].yCoords;
                if (Math.abs(xDist) < radiusOfAttraction && Math.abs(yDist) < radiusOfAttraction && !onTop && !onBottom && !onRight && !onLeft){
                    circleList[j].nearHand = key;
                    if (Math.abs(xDist) < circleList[j].radius + 5){
                        circleList[j].xVelocity = circleList[j].xVelocity / 2;
                    }
                    else {
                        circleList[j].xVelocity = circleList[j].xVelocity + (Math.sign(xDist) * 1);
                    }
                    if (Math.abs(yDist) < circleList[j].radius + 5){
                        circleList[j].yVelocity = circleList[j].yVelocity / 2; 
                    }else{
                        circleList[j].yVelocity = circleList[j].yVelocity + (Math.sign(yDist) * 1);
                    }
                    if (Math.abs(xDist) < circleList[j].radius + 5 && Math.abs(yDist) < circleList[j].radius + 5){
                        if (circleList[j].xVelocity < 10 && circleList[j].yVelocity < 10){
                            if (circleList[j].nearHand == key && circleList[j].readyToLaunch == false){
                                countCirclesNearHand += 1;
                                circleList[j].readyToLaunch = true;
                            }
                        }
                    }else if (circleList[j].nearHand == key){
                        if (circleList[j].readyToLaunch == true){
                            countCirclesNearHand -= 1;
                        }
                        circleList[j].readyToLaunch = false;
                    }
                    if (circleList[j].readyToLaunch && (circleList[j].xVelocity > 10 || circleList[j].yVelocity > 10)){
                        circleList[j].launching = true;
                    }
                    
                    if (countCirclesNearHand == circlesLeft){
                        circleList[j].launching = true;
                        circleList[j].xVelocity = getRandomSign() * defaultSpeed * 5 / getFPS();
                        circleList[j].yVelocity = getRandomSign() * defaultSpeed * 5 / getFPS();
                    }
                } else{
                    circleList[j].nearHand == -1;
                    circleList[j].xVelocity = Math.sign(circleList[j].xVelocity) * ((Math.random() * defaultSpeed * 2) - defaultSpeed) / getFPS();
                    circleList[j].yVelocity = Math.sign(circleList[j].yVelocity) * ((Math.random() * defaultSpeed * 2) - defaultSpeed) / getFPS();
                }            
            }
        }
        
        // TODO fix ending goal 
        // if (circleList[j].readyToLaunch){
        //     countCirclesNearHand += 1;
        // }
        // if (circleList[j].launching){
        //     circlesLeft -= 1; 
        // }
        console.log(countCirclesNearHand);
        console.log(circlesLeft);
        if (circleList[j].nearHand == -1 && !circleList[j].launching){
            if (Math.abs(circleList[j].xVelocity) < (defaultSpeed / getFPS())){
                circleList[j].xVelocity = circleList[j].xVelocity + Math.sign(circleList[j].xVelocity);
            }
            if (Math.abs(circleList[j].yVelocity) < (defaultSpeed / getFPS())){
                circleList[j].yVelocity = circleList[j].yVelocity + Math.sign(circleList[j].yVelocity);
            }
            if (onTop){
                circleList[j].yVelocity = circleList[j].yVelocity * -1;
                circleList[j].yCoords = canvas.height - circleList[j].radius;
            }
            if (onBottom){
                circleList[j].yCoords = circleList[j].radius;
                circleList[j].yVelocity = circleList[j].yVelocity * -1;
            }
            if (onLeft){
                circleList[j].xVelocity = circleList[j].xVelocity * -1;
                circleList[j].xCoords = circleList[j].radius;
            }
            if (onRight){
                circleList[j].xVelocity = circleList[j].xVelocity * -1;
                circleList[j].xCoords = canvas.width - circleList[j].radius;
            }
        }
        circleList[j].xCoords = circleList[j].xCoords + circleList[j].xVelocity;
        circleList[j].yCoords = circleList[j].yCoords + circleList[j].yVelocity;
        setCircleColor(circleList[j]);
        makeCircle(circleList[j]);
        if (circleList[j].launching && ((circleList[j].xCoords > canvas.width || circleList[j].xCoords < 0) || (circleList[j].yCoords > canvas.height || circleList[j].xCoords < 0))){
            circleList.splice(j, 1);
            circlesLeft -= 1; 
        }
    }
}

function makeCircle(circleObj) {
    // makes circles for level 1
    context.fillStyle = `rgba(
        ${circleObj.r},
        ${circleObj.g},
        ${circleObj.b}, 
        ${circleObj.a})`;
    context.beginPath();
    context.arc(circleObj.xCoords, circleObj.yCoords, circleObj.radius, 0, 2 * Math.PI);
    context.stroke();
    context.fill();
}
//=====================================================================
// LEVEL TWO

function setEdge(i, j, k, l, r){
    curEdge = Object.create(edge);
    curEdge.x1 = pattern.points[pattern.polys[i].vertexIndices[j]][0];
    curEdge.y1 = pattern.points[pattern.polys[i].vertexIndices[j]][1];
    curEdge.x2 = pattern.points[pattern.polys[i].vertexIndices[k]][0];
    curEdge.y2 = pattern.points[pattern.polys[i].vertexIndices[k]][1];
    curEdge.xcur = Math.floor(Math.random() * canvas.width);
    curEdge.poly = i;
    curEdge.left = l;
    curEdge.right = r;
    curEdge.length = curEdge.x1 - curEdge.x2;
    curEdge.velocity = 10;
    if (curEdge.x1 < 0 || curEdge.x1 > canvas.width || curEdge.x2 < 0 || curEdge.x2 > canvas.width || curEdge.y1 < 0 || curEdge.y1 > canvas.height || curEdge.y2 < 0 || curEdge.y2 > canvas.height){
        curEdge.frozen = true;
        frozenEdges += 1;
    }else {
        curEdge.frozen = false;
    }
    formula = getLine(curEdge.x1, curEdge.y1, curEdge.x2, curEdge.y2);
    curEdge.m = formula[0]; 
    curEdge.b = formula[1];
    return curEdge;
}
let placeholder = [];
function generateTriangles(canvas){
    // this is only done at the beginning of the level
    pattern.toCanvas(canvas);
    for (let i = 0; i < pattern.polys.length; i++){
        edge1 = setEdge(i, 0, 1, placeholder.length + 1, placeholder.length + 2);
        edge2 = setEdge(i, 1, 2, placeholder.length, placeholder.length + 2);
        edge3 = setEdge(i, 0, 2, placeholder.length, placeholder.length + 1);
        
        placeholder.push(edge1);
        placeholder.push(edge2);
        placeholder.push(edge3);
        // key = pattern.points[pattern.polys[i].vertexIndices[0]][0];
        // if (edgeList.has(key)){

        // } else {
            
        // }
    }
    //displayTriangles();
}

function displayTriangles(){
    for (let i = 0; i<pattern.polys.length; i++){
        // console.log(pattern.polys[i].vertexIndices)
        // console.log(pattern.polys[i].color._rgb[0])
        context.fillStyle = `rgba(
            ${pattern.polys[i].color._rgb[0]},
            ${pattern.polys[i].color._rgb[1]},
            ${pattern.polys[i].color._rgb[2]}, 
            ${pattern.polys[i].color._rgb[3]}
        )`;
        context.strokeStyle = `rgba(255, 255, 255, 1)`;
        context.beginPath();
        context.moveTo(pattern.points[pattern.polys[i].vertexIndices[0]][0], pattern.points[pattern.polys[i].vertexIndices[0]][1]);
        context.lineTo(pattern.points[pattern.polys[i].vertexIndices[1]][0], pattern.points[pattern.polys[i].vertexIndices[1]][1]);
        context.lineTo(pattern.points[pattern.polys[i].vertexIndices[2]][0], pattern.points[pattern.polys[i].vertexIndices[2]][1]);
        context.closePath();
        context.stroke();
        context.fill();
    }
    context.fillStyle = `rgba(255, 255, 255, 1)`;
    context.strokeStyle = `rgba(255, 255, 255, 1)`;
    context.beginPath();
    context.moveTo(pattern.points[pattern.polys[0].vertexIndices[0]][0], pattern.points[pattern.polys[0].vertexIndices[0]][1]);
    context.lineTo(pattern.points[pattern.polys[0].vertexIndices[1]][0], pattern.points[pattern.polys[0].vertexIndices[1]][1]);
    context.lineTo(pattern.points[pattern.polys[0].vertexIndices[2]][0], pattern.points[pattern.polys[0].vertexIndices[2]][1]);
    context.closePath();
    context.stroke();
    context.fill();
}

function drawLine(x1, y1, x2, y2){
    context.strokeStyle = `rgba(255, 255, 255, 1)`;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.closePath();
    context.stroke();
}

function checkTouching(edge){
    for (let [key, value] of localPred) {
        if (edge.x1 > edge.x2){
            maxx = edge.x1;
            minx = edge.x2;
        } else {
            maxx = edge.x2;
            minx = edge.x1;
        }
        if (edge.y1 > edge.y2){
            maxy = edge.y1;
            miny = edge.y2;
        } else {
            maxy = edge.y2;
            miny = edge.y1;
        }
        if (value.x > minx && value.x < maxx && value.y > miny && value.y < maxy){
            return true;
        } else {
            return false;
        }
    }
}

function moveLines(){
    for (let i = 0; i<pattern.polys.length; i++){ 
        if (placeholder[i].frozen || checkTouching(placeholder[i])){
            
            if (placeholder[placeholder[i].left].frozen && placeholder[placeholder[i].right].frozen){
                tri = placeholder[i].poly;
                context.fillStyle = `rgba(
                    ${pattern.polys[tri].color._rgb[0]},
                    ${pattern.polys[tri].color._rgb[1]},
                    ${pattern.polys[tri].color._rgb[2]}, 
                    ${pattern.polys[tri].color._rgb[3]}
                )`;
                context.strokeStyle = `rgba(255, 255, 255, 1)`;
                context.beginPath();
                context.moveTo(pattern.points[pattern.polys[tri].vertexIndices[0]][0], pattern.points[pattern.polys[tri].vertexIndices[0]][1]);
                context.lineTo(pattern.points[pattern.polys[tri].vertexIndices[1]][0], pattern.points[pattern.polys[tri].vertexIndices[1]][1]);
                context.lineTo(pattern.points[pattern.polys[tri].vertexIndices[2]][0], pattern.points[pattern.polys[tri].vertexIndices[2]][1]);
                context.closePath();
                context.stroke();
                context.fill();
                // if (!placeholder[i].frozen){
                //     frozenTris += 1;
                //     console.log(frozenTris);
                //     console.log(pattern.polys.length);
                // }
            } else {
                x1 = placeholder[i].x1;
                y1 = placeholder[i].y1;
                x2 = placeholder[i].x2;
                y2 = placeholder[i].y2;
                drawLine(x1, y1, x2, y2);
            }
            if (!placeholder[i].frozen){
                placeholder[i].frozen = true;
                frozenEdges += 1;
                console.log(frozenEdges);
                console.log(placeholder.length);
            }
        } else {
            x1 = placeholder[i].xcur;
            y1 = (x1 * placeholder[i].m) + placeholder[i].b;
            x2 = placeholder[i].xcur + placeholder[i].length;
            y2 = (x2 * placeholder[i].m) + placeholder[i].b;
            drawLine(x1, y1, x2, y2);
            // console.log(canvas.width)
            if (x1 > canvas.width){
                placeholder[i].xcur = -1 * Math.abs(placeholder[i].length);
            } else {
                placeholder[i].xcur = x1 + placeholder[i].velocity;
            }
        }
        // console.log(placeholder[0]);
        // console.log(y1);
    }
}
// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});
