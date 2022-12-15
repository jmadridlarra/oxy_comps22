# "Computational Queries"
Joaquín Madrid Larrañaga's Senior comprehensive project Fall 2022

# Replication Instructions
1. Clone this github repository. [How to clone a github repo](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
2. Install [trianglify v4.1.1](https://trianglify.io/): `npm install --save trianglify` 
3. Navigate to canvas\hantrack.js-testing
4. Open handtrack.html
5. Wait until the text in the upper left hand corner reads "Loaded Model!".  If the text does not change from "loading..." there is an error with the handtrack.js library.  Information on troubleshooting this error can be found [here](https://victordibia.com/handtrack.js/#/)
5. Click "Start Game" (the left most button).
6. Click Allow on the dialogue popup box to allow the website to use your camera. 
    - You should see a mini-version of your live video feed on the bottom left hand side of the window.  If you do not and your webcam does not appear to be on, make sure that this application as access to your webcam. 
7. You should see white circles floating across the screen.  If you do not, click "Reset Game" (second to last button).
8. The installation is now active! Keep in mind that the handtracking software works best in a well lit room with your hands about 3-4 feet away from the camera.  Please note that this is a processor heavy installation so hand recognition may be slow on older devices.  

# Code Architecture Overview
Handtrack.js-testing.html stores the code to create the webapp webpage and links the buttons to the javascript functions.  It also imports the Handtrack.js and Trianglify libraries. 

This project uses object oriented JavaScript programming.  The 'hand' object stores information collected from Handtrack.js.
const hand = {
    x: 0, # the x position of the hand
    y: 0, # the y position of the hand
    height: 0, # the height of the bounding box
    width: 0, # the width of the bounding box
    sinceConfirmed: 0, # number of frames since the hand has been confirmed by the RCNN to still exist in the frame. 
    ID:0, # unique ID
}
* Lines 1-5: HTML constants
* Lines 6-30: Handtrack.js constants & `hand` object definition
* Lines 33-62: Level One constants
  - The main object in level one is the `circle` object which contains information like the position, color, radius, and velocity of the circle. 
* Lines 65-92: Level Two Constants
  - The main object in level two is the triangle `edge` object which stores information such as the state of the edge (moving, freezing, frozen, collidable), velocity, final resting position, which other edges make up the triangle, which triangle it belongs to, current position.
* Lines 94-219: Handtracking functions
  - Contains functions that map to the clickable buttons in the HTML file.
  - runDetection()
    - runs the handtrack.js code and returns information about the bounding boxes of each hand. 
  - updateFame()
    - clears the canvas and runs the necessary functions to repopulate the canvas each frame. 
  - translateCoords()
    - takes the coordinates of the hands on the video feed and scales them to the dimensions of the canvas. 
* Lines 220-314: Handtrack helper functions
  - updateLocalPred()
    - identifies the possible new hands based on the RCNN bounding boxes and compares them with the old hands to see if new users have entered the space or if the bounding boxes are just for the same hands that have already existed. 
* Lines 315-356: MISC helper functions
* Lines 357-544: Level One
  - setCircleColor()
    - changes the color based upon the position of the circle and the speed the circle is traveling. 
  - getNewCircleCoords()
    - handles collisions, changing directions when the circle is near the edge, and accounts for the gravity of the user's hand. 
* Lines 555-875: Level Two
  - checkTouching()
    - based upon the line that makes up a triangle's edge, a thin rectangle is created and if a hand coordinate is touching the rectangle checkTouching returns True
  - moveLines()
    - responsible for changing the state of the edge as well as moving the edge across the screen. 
