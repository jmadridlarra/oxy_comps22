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
const totalBlobs = 1;
const miniBlob = {
    // isConnecting: false,
    // x: canvas.width / 2,
    // y: canvas.height / 2,
    // yVelocity: defaultSpeed * 0.8,
    // xVelocity: defaultSpeed * 0.8,
    r: 255,
    g: 165,
    b: 0,
    a: 1, 
    // isCut: false,
    points: [
       // [200, 150],
        [400, 500],
        [600, 600],
        [800, 400],
        [750, 300],
        [300, 200],
    ],
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
        canvas.style.height =
        parseInt(canvas.style.width) *
            (mediasource.height / mediasource.width).toFixed(2) +
        "px";
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

    } else if (levelThree){
        moveBlobs();
    } else {
        growRects();

    }
    // creates the shadow avatar visual representation of the user's hands on the screen as hollow circles
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
    // creates the shadow avatar visual representation of the user's hands on the screen as hollow circles
    for (let [key, value] of localPred) {
        if (levelOne){
            context.strokeStyle = `rgba(255, 255, 255, 1)`;
        } else {
            context.strokeStyle = `rgba(255, 255, 255, 1)`;
        }
        context.beginPath();
        context.arc(value.x, value.y, 5, 0, 2 * Math.PI);
        context.stroke();
    }
}

//==================================================
// linear algebra helper methods - adapted from vector.js
function Vector(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  }

  Vector.prototype = {
    negative: function() {
      return new Vector(-this.x, -this.y);
    },
    add: function(v) {
      if (v instanceof Vector) return new Vector(this.x + v.x, this.y + v.y);
      else return new Vector(this.x + v, this.y + v);
    },
    subtract: function(v) {
      if (v instanceof Vector) return new Vector(this.x - v.x, this.y - v.y);
      else return new Vector(this.x - v, this.y - v);
    },
    multiply: function(v) {
      if (v instanceof Vector) return new Vector(this.x * v.x, this.y * v.y);
      else return new Vector(this.x * v, this.y * v);
    },
    divide: function(v) {
      if (v instanceof Vector) return new Vector(this.x / v.x, this.y / v.y);
      else return new Vector(this.x / v, this.y / v);
    },
    equals: function(v) {
      return this.x == v.x && this.y == v.y;
    },
    dot: function(v) {
      return this.x * v.x + this.y * v.y;
    },
    // cross: function(v) {
    //   return new Vector(
    //     this.y * v.z - this.z * v.y,
    //     this.z * v.x - this.x * v.z,
    //     this.x * v.y - this.y * v.x
    //   );
    // },
    length: function() {
      return Math.sqrt(this.dot(this));
    },
    unit: function() {
      return this.divide(this.length());
    },
    min: function() {
      return Math.min(this.x, this.y);
    },
    max: function() {
      return Math.max(this.x, this.y);
    },
    // toAngles: function() {
    //   return {
    //     theta: Math.atan2(this.z, this.x),
    //     phi: Math.asin(this.y / this.length())
    //   };
    // },
    angleTo: function(a) {
      return Math.acos(this.dot(a) / (this.length() * a.length()));
    },
    toArray: function(n) {
      return [this.x, this.y].slice(0, n || 2);
    },
    clone: function() {
      return new Vector(this.x, this.y);
    },
    init: function(x, y) {
      this.x = x; this.y = y; 
      return this;
    }
  };
  //Static Methods
  //Vector.randomDirection() returns a vector with a length of 1 and a statistically uniform direction. Vector.lerp() performs linear interpolation between two vectors.
  
  Vector.negative = function(a, b) {
    b.x = -a.x; b.y = -a.y;
    return b;
  };
  Vector.add = function(a, b, c) {
    if (b instanceof Vector) { c.x = a.x + b.x; c.y = a.y + b.y;}
    else { c.x = a.x + b; c.y = a.y + b;}
    return c;
  };
  Vector.subtract = function(a, b, c) {
    if (b instanceof Vector) { c.x = a.x - b.x; c.y = a.y - b.y;}
    else { c.x = a.x - b; c.y = a.y - b;}
    return c;
  };
  Vector.multiply = function(a, b, c) {
    if (b instanceof Vector) { c.x = a.x * b.x; c.y = a.y * b.y;}
    else { c.x = a.x * b; c.y = a.y * b;}
    return c;
  };
  Vector.divide = function(a, b, c) {
    if (b instanceof Vector) { c.x = a.x / b.x; c.y = a.y / b.y;}
    else { c.x = a.x / b; c.y = a.y / b;}
    return c;
  };
//   Vector.cross = function(a, b, c) {
//     c.x = a.y * b.z - a.z * b.y;
//     c.y = a.z * b.x - a.x * b.z;
//     c.z = a.x * b.y - a.y * b.x;
//     return c;
//   };
  Vector.unit = function(a, b) {
    var length = a.length();
    b.x = a.x / length;
    b.y = a.y / length;
    return b;
  };
  Vector.fromAngles = function(theta, phi) {
    return new Vector(Math.cos(theta) * Math.cos(phi), Math.sin(phi), Math.sin(theta) * Math.cos(phi));
  };
  Vector.randomDirection = function() {
    return Vector.fromAngles(Math.random() * Math.PI * 2, Math.asin(Math.random() * 2 - 1));
  };
  Vector.min = function(a, b) {
    return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y));
  };
  Vector.max = function(a, b) {
    return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y));
  };
  Vector.lerp = function(a, b, fraction) {
    return b.subtract(a).multiply(fraction).add(a);
  };
  Vector.fromArray = function(a) {
    return new Vector(a[0], a[1]);
  };
  Vector.angleBetween = function(a, b) {
    return a.angleTo(b);
  };
  

//================================================
// MISC HELPER METHODS
function getLine(x1, y1, x2, y2){
    m = (y2 -y1)/(x2 -x1);
    b = (y1 - (m*x1));
    return [m, b];
}

function testFunc(){
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
    } else {
        initRects();
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
    bubbleRadius = 20; 
    for (let i = 0; i < totalCircles; i++){
        circleList[i] = Object.create(circle);
        circleList[i].xCoords = Math.floor(Math.random() * canvas.width);
        circleList[i].yCoords = Math.floor(Math.random() * canvas.height);
        circleList[i].radius = bubbleRadius;
        circleList[i].xVelocity = ((Math.random() * defaultSpeed * 2) - defaultSpeed) / getFPS();
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
            // 0 -> 30, 191 -> 255
            rline = getLine(0, 191, 30, 255);
            circle.r = (circle.xVelocity * rline[0]) + rline[1];
            // 0 -> 30, 64 -> 255
            gline = getLine(0, 64, 30, 255);
            circle.g = (circle.xVelocity * gline[0]) + gline[1];
            // 0 -> 30, 191 -> 0
            bline = getLine(0, 191, 30, 0);
            circle.b = (circle.xVelocity * bline[0]) + bline[1];
            
        } else{
            // 0 -> 30, 191 -> 255
            rline = getLine(0, 191, 30, 255);
            circle.r = (circle.yVelocity * rline[0]) + rline[1];
            // 0 -> 30, 64 -> 255
            gline = getLine(0, 64, 30, 255);
            circle.g = (circle.yVelocity * gline[0]) + gline[1];
            // 0 -> 30, 191 -> 0
            bline = getLine(0, 191, 30, 0);
            circle.b = (circle.yVelocity * bline[0]) + bline[1];
        }
    } else {
        // white
        circle.r = 255;
        circle.g = 255;
        circle.b = 255;
    }
}

function getNewCircleCoords(canvas, predictions, mediasource){
    // moves the circles each frame
    for (let j = 0; j < circleList.length; j++) {
        // checks if a circle is on an edge
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
            // TODO you touch a line and it freezes in position
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
                    } else if (value.x + 5 < maxx - size && value.y - 5 > miny + size){
                        // left bottom triangle
                        touching = false;
                    } else {
                        return true;
                    }
                    
                } else {
                    touching = false;
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
                    } else if (value.x - 5 > minx + size && value.y - 5 > miny + size){
                        //  bottom right triangle
                        touching = false;
                    } else {
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
           
            if (x1 > canvas.width){
                placeholder[i].xcur = -1 * Math.abs(placeholder[i].length);
            } else {
                placeholder[i].xcur = x1 + placeholder[i].velocity;
            }
        }

    }
}

// ================================================
// LEVEL THREE
function initBlobs(){
    for (let i = 0; i < totalBlobs; i++){
        blobList[i] = Object.create(miniBlob);
        blobList[i].x = Math.floor(Math.random() * canvas.width);
        blobList[i].y = Math.floor(Math.random() * canvas.height);
        blobList[i].xVelocity = defaultSpeed / getFPS();
        blobList[i].yVelocity = defaultSpeed / getFPS();
    }
}

function moveBlobs(){
    for (let i = 0; i < totalBlobs; i++){
        //TODO: have points move randomly and bounce off the screen
        sortByConvexHull(blobList[i]);
        setBlobColor(blobList[i]);
        drawBlob(blobList[i]);
        drawPoints(blobList[i]);
    }
}

function drawPoints(blob){
    // 0 -> 30, 191 -> 255
    rline = getLine(0, 100, 6, 255);
    for (let i = 0; i < blob.points.length; i++){
        context.fillStyle = `rgba(
            ${i * rline[0] + rline[1]},
            ${i * rline[0] + rline[1]},
            ${i * rline[0] + rline[1]}, 
            ${1})`;
        context.beginPath();
        context.arc(blob.points[i][0], blob.points[i][1], 5, 0, 2 * Math.PI);
        context.stroke();
        context.fill();
    }
}
function setBlobColor(blob){
    blob.r = 255
    blob.g = 255;
    blob.b = 255;
    blob.a = 1;
}
function drawBlob(blobObj) {
    context.fillStyle = `rgba(
        ${blobObj.r},
        ${blobObj.g},
        ${blobObj.b}, 
        ${blobObj.a})`;
    console.log("beginning path")
    context.beginPath();
    context.moveTo(blobObj.points[0][0], blobObj.points[0][1]);
    firstSeg = calcSegment(blobObj.points[blobObj.points.length-1], blobObj.points[0], blobObj.points[1], blobObj.points[2]);
    for (let j = 0; j <= 1; j += 0.01){
        curPoint = getPointOnSeg(firstSeg, j).toArray();
        console.log(curPoint);
        context.lineTo(curPoint[0], curPoint[1]);
    }

    for (let i = 0; i < blobObj.points.length - 4; i++){
        curSeg = calcSegment(blobObj.points[i], blobObj.points[i+1], blobObj.points[i+2], blobObj.points[i+3]);
        for (let j = 0; j <= 1; j += 0.01){
            curPoint = getPointOnSeg(curSeg, j).toArray();
            console.log(curPoint);
            context.lineTo(curPoint[0], curPoint[1]);
        }
    }
    penSeg = calcSegment(blobObj.points[blobObj.points.length-3], blobObj.points[blobObj.points.length-2], blobObj.points[blobObj.points.length-1], blobObj.points[0]);
    for (let j = 0; j <= 1; j += 0.01){
        curPoint = getPointOnSeg(penSeg, j).toArray();
        console.log(curPoint);
        context.lineTo(curPoint[0], curPoint[1]);
    }
    lastSeg = calcSegment(blobObj.points[blobObj.points.length-2], blobObj.points[blobObj.points.length-1], blobObj.points[0], blobObj.points[1]);
    for (let j = 0; j <= 1; j += 0.01){
        curPoint = getPointOnSeg(lastSeg, j).toArray();
        console.log(curPoint);
        context.lineTo(curPoint[0], curPoint[1]);
    }

    context.stroke();
    //context.fill();
    console.log("filling")
}

function cross(a, b, o) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
 }
 

function convexHull(points) {
    points.sort(function(a, b) {
       return a[0] == b[0] ? a[1] - b[1] : a[0] - b[0];
    });
 
    var lower = [];
    for (var i = 0; i < points.length; i++) {
       while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
          lower.pop();
       }
       lower.push(points[i]);
    }
 
    var upper = [];
    for (var i = points.length - 1; i >= 0; i--) {
       while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
          upper.pop();
       }
       upper.push(points[i]);
    }
 
    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

function sortByConvexHull(blob){
    blob.points = convexHull(blob.points);
}

function distance(p0, p1){
    return Math.pow(Math.pow(p0[0]-p1[0], 2) + Math.pow(p1[1]-p1[1], 2), 0.5);
}

function calcSegment(p0, p1, p2, p3,){
    alpha = 1; // 0 for uniform Catmull-Rom Splines - 1 for chordal variant , 0.5 for centripital variant
    tension = 0; // smooth curve, 1=straight lines
    segment = []; // the coefficients of the polynomials at^3 + bt^2 + ct + d


    t01 = Math.pow(distance(p0, p1), alpha);
    t12 = Math.pow(distance(p1, p2), alpha);
    t23 = Math.pow(distance(p2, p3), alpha);

    p0 = Vector.fromArray(p0);
    p1 = Vector.fromArray(p1);
    p2 = Vector.fromArray(p2);
    p3 = Vector.fromArray(p3);
    

    m1 = (p2.subtract(p1).add(t12).multiply(((p1.subtract(p0)).divide(t01).subtract((p2.subtract(p0)).divide((t01 + t12)))))).multiply((1 - tension));
    m2 = (p2.subtract(p1).add(t12).multiply(((p3.subtract(p2)).divide(t23).subtract((p3.subtract(p1)).divide((t12 + t23)))))).multiply((1 - tension));

    segment[0] = (p1.subtract(p2)).multiply(2).add(m1).add(m2);
    segment[1] = (p1.subtract(p2)).multiply(-3).subtract(m1).subtract(m1).subtract(m2);
    segment[2] = m1;
    segment[3] = p1;
    return segment;
}

function getPointOnSeg(segment, t){
    // t should be from 0-1 where 0 is the start and 1 is the end
    point = segment[0].multiply(t * t * t).add(
             segment[1].multiply(t * t)).add(
             segment[2].multiply(t)).add(
             segment[3]);
    return point;
}
// ================================================
// LEVEL FOUR
function initRects(){

}
function growRects(){

}
// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});
