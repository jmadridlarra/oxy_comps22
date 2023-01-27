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
let levelThree = false;
let levelFour = false;

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
let totalCircles = 40;
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
const options = {height: canvas.height, width: canvas.width, cellSize: 250,};
var pattern = trianglify(options);
console.log(pattern instanceof trianglify.Pattern); // true
const edgeList = new Map();
var frozenEdges = 0;
const edge = {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    poly1: 0, // possibly part of two different triangles
    poly2: 0,
    tri1side1: false, // each edge is part of 2 triangles so would have 4 possible sides. 
    tri1side2: false,
    tri2side1: false, 
    tri2side2: false, 
    m: 0, 
    b: 0,
    xcur: 0,
    length: 0,
    velocity: 15,
    frozen: false,
    freezing: false,
    color: `rgba(135, 206, 250, 1)`, // light blue
}

//========================================
// LEVEL THREE global vars
const blobList = [];
const miniBlob = {
    isConnecting: false,
    x: canvas.width / 2,
    y: canvas.height / 2,
    yVelocity: defaultSpeed * 0.8,
    xVelocity: defaultSpeed * 0.8,
    r: 255,
    g: 165,
    b: 0,
    a: 1, 
    isCut: false,
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
    if (levelOne){
        levelOne = false;
        levelTwo = true;
    }else if (levelTwo){
        levelTwo = false;
        levelThree = true;
    } else if (levelThree){
        levelThree = false;
        levelFour = true;
    } else {
        levelFour = false;
        levelOne = true;
    }
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
    } else if (levelThree){
        moveBlobs();
    } else {
        growRects();
    }
    makeSmallCircles(predictions, video, canvas);
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
        frozenEdges = 0;
        pattern = trianglify(options);
        console.log(pattern instanceof trianglify.Pattern); // true
        generateTriangles(canvas);
        
    } else if (levelThree){
        initBlobs();
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
        //console.log(circleList[i].xVelocity);
        circleList[i].yVelocity = ((Math.random() * defaultSpeed * 2)- defaultSpeed) / getFPS();
    }
}

function setCircleColor(circle){
    if (circle.launching){
        circle.r = 0;
        circle.g = 255;
        circle.b = 0;
    } else if (circle.nearHand != -1){
        //circle.r = 0;
        //circle.g = 255;
        //circle.b = 0;
        // PURPLE - rgb(191, 64, 191)
        // YELLOW - rgb(255,255,0)
        if (circle.xVelocity >= circle.yVelocity){
            // 50 -> 0, 10 -> 255
            rline = getLine(0, 191, 30, 255);
            circle.r = (circle.xVelocity * rline[0]) + rline[1];
            // 10-50 yellow 255, 255, 0; green 0, 255, 0
            // 50 -> 255, 10 -> 0
            gline = getLine(0, 64, 30, 255);
            circle.g = (circle.xVelocity * gline[0]) + gline[1];
            // 50 -> 0, 10 -> 255
            bline = getLine(0, 191, 30, 0);
            circle.b = (circle.xVelocity * bline[0]) + bline[1];
            
        } else{
            // 50 -> 0, 10 -> 255
            rline = getLine(0, 191, 30, 255);
            circle.r = (circle.yVelocity * rline[0]) + rline[1];
            // 50 -> 255, 10 -> 0
            gline = getLine(0, 64, 30, 255);
            circle.g = (circle.yVelocity * gline[0]) + gline[1];
            // 50 -> 0, 10 -> 255
            bline = getLine(0, 191, 30, 0);
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
        }else if (circleList[j].nearHand != -1){
            circleList[j].xVelocity = getRandomSign() * ((Math.random() * defaultSpeed * 2) - defaultSpeed) / getFPS();
            circleList[j].yVelocity = getRandomSign() * ((Math.random() * defaultSpeed * 2) - defaultSpeed) / getFPS();
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
function alreadySet(i, one, two){
    // checks if an edge has already been added to the array
    // TODO double check list comprehension
    for (let j = 0; j < placeholder.length; j++){
        //console.log(placeholder[j]);
        if (placeholder[j].x1 == pattern.points[pattern.polys[i].vertexIndices[one]][0] && placeholder[j].y1 == pattern.points[pattern.polys[i].vertexIndices[one]][1] && placeholder[j].x2 == pattern.points[pattern.polys[i].vertexIndices[two]][0] && placeholder[j].y2 == pattern.points[pattern.polys[i].vertexIndices[two]][1]){
            return j;
        }
    }
    return false;
}

function setEdge(i, j, k){
    if (pattern.points[pattern.polys[i].vertexIndices[j]][0] < pattern.points[pattern.polys[i].vertexIndices[k]][0]){
        one = j;
        two = k;
    } else{
        one = k;
        two = j;
    }
    possible_already_set = alreadySet(i, one, two)
    //console.log(possible_already_set);
    if (typeof possible_already_set === 'number'){
        // set second poly, if it's already set and it's coming back again we assume it's because it's part of two polygons
        if (placeholder[possible_already_set].poly1 != i){
            placeholder[possible_already_set].poly2 = i;
        }    
        return possible_already_set;
    }

    curEdge = Object.create(edge);
    curEdge.x1 = pattern.points[pattern.polys[i].vertexIndices[one]][0];
    curEdge.y1 = pattern.points[pattern.polys[i].vertexIndices[one]][1];
    curEdge.x2 = pattern.points[pattern.polys[i].vertexIndices[two]][0];
    curEdge.y2 = pattern.points[pattern.polys[i].vertexIndices[two]][1];
    curEdge.xcur = Math.floor(Math.random() * canvas.width);
    curEdge.poly1 = i;
    // set first poly
    //curEdge.left = l;
    //curEdge.right = r;
    curEdge.length = curEdge.x2 - curEdge.x1;
    curEdge.velocity = 5;
    if (curEdge.x1 < 0 || curEdge.x1 > canvas.width || curEdge.x2 < 0 || curEdge.x2 > canvas.width || curEdge.y1 < 0 || curEdge.y1 > canvas.height || curEdge.y2 < 0 || curEdge.y2 > canvas.height){
        curEdge.frozen = true;
        curEdge.color = `rgba(255, 255, 255, 1)`
        frozenEdges += 1;
    }else {
        curEdge.frozen = false;
    }
    formula = getLine(curEdge.x1, curEdge.y1, curEdge.x2, curEdge.y2);
    curEdge.m = formula[0]; 
    curEdge.b = formula[1];
    return curEdge;
}

function addEdges(possible_edges){
    indices = [];
    // collect all the placeholder indices so we can add information about the entire triangle to the edge
    for (let i = 0; i < possible_edges.length; i++){
        if (typeof possible_edges[i] === 'number'){
            indices.push(possible_edges[i]);
        } else {
            placeholder.push(possible_edges[i]);
            indices.push(placeholder.length - 1);
        }
    }
    for (let i = 0; i < indices.length; i++){
        if (placeholder[indices[i]].tri1side1 === false){
            placeholder[indices[i]].tri1side1 = indices.at(i - 1);
            placeholder[indices[i]].tri1side2 = indices.at(i - 2);
            // add indices of other edges
        } else if (placeholder[indices[i]].tri2side1 === false){
            placeholder[indices[i]].tri2side1 = indices.at(i - 1);
            placeholder[indices[i]].tri2side2 = indices.at(i - 2);
        } else {
            throw "all sides defined already"
        }
    }
}

let placeholder = [];
function generateTriangles(canvas){
    // this is only done at the beginning of the level
    pattern.toCanvas(canvas);
    for (let i = 0; i < pattern.polys.length; i++){
        edge1 = setEdge(i, 0, 1);
        edge2 = setEdge(i, 1, 2);
        edge3 = setEdge(i, 0, 2);
        
        addEdges([edge1, edge2, edge3]);
    }
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

function drawLine(x1, y1, x2, y2, stroke=`rgba(255, 255, 255, 1)`){
    context.strokeStyle = stroke;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.closePath();
    context.stroke();
}

function readyToLock(edge){
    edge.color = `rgba(135, 206, 250, 1)`;
    if (edge.xcur >= edge.x1 - edge.length){
        if (edge.xcur < edge.x1 + 6){
            if (edge.frozen){
                edge.color = `rgba(255, 0, 0, 1)`;
            } else {
                edge.color = `rgba(0, 255, 0, 1)`;
            }
            //console.log("red");
        } 
    } 
    return edge;
}

function checkTouching(edge){
    size = 6;
    touching = false;
    //color = `rgba(255, 255, 255, 1)`;
    if (edge.color == `rgba(0, 255, 0, 1)`){
        for (let [key, value] of localPred) {
            // if (value.x + 2.5 > minx && value.x - 2.5 < maxx && value.y + 2.5 > miny && value.y - 2.5 < maxy){
            //     if (value.x - 2.5 > minx + size && value.y + 2.5 < maxy - size){
            //         // top right triangle
            //         return false;
            //     }
            //     if (value.x + 2.5 < maxx - size && value.y - 2.5 > miny + size){
            //         // left right triangle
            //         return false;
            //     }
            //     console.log("returning true");
            //     return true;
            // } else {
            //     return false;
            // }
            // TODO you touch a line and it freezes in position
            
            // console.log("near")
            // console.log(edge.xcur);
            // if (edge.xcur < edge.x2){
            //     color = 'red';
            // }
            if (edge.y2 > edge.y1){
                // negative slope
                minx = edge.xcur;
                miny = (edge.m * edge.xcur) + edge.b;
                maxx = edge.x2;
                maxy = edge.y2;
                if (value.x + 5 > minx && value.x - 5 < maxx && value.y + 5 > miny && value.y - 5 < maxy){
                    // in the rect
                    if (value.x - 5 > minx + size && value.y + 5 < maxy - size){
                        // top right triangle
                        touching = false;
                        //console.log("top right");
                    } else if (value.x + 5 < maxx - size && value.y - 5 > miny + size){
                        // left bottom triangle
                        touching = false;
                        //console.log("left bottom");
                    } else {
                        //console.log("returning true");
                        //edge.color = color;
                        return true;
                    }
                    
                } else {
                    touching = false;
                    //console.log("not in rect");
                }
            } else {
                // positive slope
                minx = edge.xcur;
                miny = edge.y2;
                maxx = edge.x2;
                maxy = (edge.m * edge.xcur) + edge.b;
                if (value.x + 5 > minx && value.x - 5 < maxx && value.y + 5 > miny && value.y - 5 < maxy){
                    // in the rect
                    if (value.x + 5 < maxx - size && value.y + 5 < maxy - size){
                        // top left triangle
                        touching = false;
                        //console.log("top right");
                    } else if (value.x - 5 > minx + size && value.y - 5 > miny + size){
                        //  bottom right triangle
                        touching = false;
                        //console.log("left bottom");
                    } else {
                        //console.log("returning true");
                        //edge.color = color;
                        return true;
                    }
                }
            }
            
        }
    }
    //edge.color = color;
    return touching;
}

function moveLines(){
    for (let i = 0; i<placeholder.length; i++){ 
        placeholder[i] = readyToLock(placeholder[i]);
        if (!placeholder[i].freezing && checkTouching(placeholder[i])){
            placeholder[i].freezing = true;
            placeholder[i].color = `rgba(0, 0, 255, 1)`;
        }
        if (!placeholder[i].frozen && placeholder[i].freezing){
            if (placeholder[i].xcur > placeholder[i].x1){
                if (placeholder[i].m > 0){
                    if ((placeholder[i].xcur * placeholder[i].m) + placeholder[i].b > placeholder[i].y1){
                        placeholder[i].frozen = true;
                        placeholder[i].color = `rgba(255, 0, 0, 1)`;
                        frozenEdges += 1; 
                        console.log(frozenEdges);
                        console.log(placeholder.length);
                    }
                } else {
                    if ((placeholder[i].xcur * placeholder[i].m) + placeholder[i].b < placeholder[i].y1){
                        placeholder[i].frozen = true;
                        placeholder[i].color = `rgba(255, 0, 0, 1)`;
                        frozenEdges += 1; 
                        console.log(frozenEdges);
                        console.log(placeholder.length);
                    }
                }
            } 
        }
        
        if (placeholder[i].frozen){
            
            if (placeholder[placeholder[i].tri1side1].frozen && placeholder[placeholder[i].tri1side2].frozen){
                tri = placeholder[i].poly1;
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
            } 
            if (placeholder[i].tri2side1 && placeholder[placeholder[i].tri2side1].frozen && placeholder[placeholder[i].tri2side2].frozen){
                tri = placeholder[i].poly2;
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
            }
            if (!placeholder[placeholder[i].tri1side1].frozen && placeholder[i].tri2side1 && !placeholder[placeholder[i].tri2side1].frozen){
                x1 = placeholder[i].x1;
                y1 = placeholder[i].y1;
                x2 = placeholder[i].x2;
                y2 = placeholder[i].y2;
                drawLine(x1, y1, x2, y2, placeholder[i].color);
            }
        } else {
            x1 = placeholder[i].xcur;
            y1 = (x1 * placeholder[i].m) + placeholder[i].b;
            x2 = placeholder[i].xcur + placeholder[i].length;
            y2 = (x2 * placeholder[i].m) + placeholder[i].b;
            drawLine(x1, y1, x2, y2, placeholder[i].color);
           
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

// ================================================
// LEVEL THREE

// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});
