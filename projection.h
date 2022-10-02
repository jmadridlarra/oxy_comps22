/*******************************************************************
** This code is part of Breakout.
**
** Breakout is free software: you can redistribute it and/or modify
** it under the terms of the CC BY 4.0 license as published by
** Creative Commons, either version 4 of the License, or (at your
** option) any later version.
******************************************************************/
#ifndef PROJECTION_H
#define PROJECTION_H

#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include "projection_level.h"

// Represents the current state of the projection
enum ProjectionState {
    PROJECTION_ACTIVE,
    PROJECTION_MENU,
    PROJECTION_WIN
};

// Projection holds all game-related state and functionality.
// Combines all game-related data into a single class for
// easy access to each of the components and manageability.
class Projection
{
public:
    // game state
    ProjectionState               State;
    bool                    Keys[1024];
    unsigned int            Width, Height;
    std::vector<ProjectionLevel> Levels;
    unsigned int           Level;
    // constructor/destructor
    Projection(unsigned int width, unsigned int height);
    ~Projection();
    // initialize game state (load all shaders/textures/levels)
    void Init();
    // game loop
    void ProcessInput(GLFWwindow* window, float dt); //adding window for key input
    void Update(float dt);
    void Render();
};

#endif