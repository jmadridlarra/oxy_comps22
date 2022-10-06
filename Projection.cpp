/*******************************************************************
** This code is part of Breakout.
**
** Breakout is free software: you can redistribute it and/or modify
** it under the terms of the CC BY 4.0 license as published by
** Creative Commons, either version 4 of the License, or (at your
** option) any later version.
******************************************************************/
#include "projection.h"
#include "sprite_renderer.h"
#include "resource_manager.h"
#include "circle_object.h"
#include <windows.h>
#pragma comment(lib, "user32.lib")
#include <iostream>
#include <sstream>
#include <fstream>

GameObject* Player;
// Game-related State data
SpriteRenderer* Renderer;

const int number_of_circles = 50;

CircleObject* circles[number_of_circles]; // make lots of circles?

Projection::Projection(unsigned int width, unsigned int height)
    : State(PROJECTION_ACTIVE), Keys(), Width(width), Height(height)
{

}

Projection::~Projection()
{
    delete Renderer;
    delete Player;
}


void Projection::Init()
{
    // load shaders
    ResourceManager::LoadShader("C:/Users/joaqu/OneDrive/Desktop/comps/my_shader.vs", "C:/Users/joaqu/OneDrive/Desktop/comps/my_shader.fs", nullptr, "sprite");
    // configure shaders
    glm::mat4 projection = glm::ortho(0.0f, static_cast<float>(this->Width),
        static_cast<float>(this->Height), 0.0f, -1.0f, 1.0f);
    ResourceManager::GetShader("sprite").Use().SetInteger("image", 0);
    ResourceManager::GetShader("sprite").SetMatrix4("projection", projection);
    // set render-specific controls
    Shader myShader;
    myShader = ResourceManager::GetShader("sprite");
    Renderer = new SpriteRenderer(myShader);
    // load textures
    ResourceManager::LoadTexture("../../../../OneDrive/Desktop/comps/textures/trans_circle.png", true, "circle");
    // load textures
    ResourceManager::LoadTexture("../../../../OneDrive/Desktop/comps/textures/hand.png", true, "hand_paddle"); // now it is black
    //ResourceManager::LoadTexture("textures/awesomeface.png", true, "face"); use circle insted
    //ResourceManager::LoadTexture("textures/block.png", false, "block");
    //ResourceManager::LoadTexture("textures/block_solid.png", false, "block_solid");
    // load levels
    ProjectionLevel one; one.Load("../../../../OneDrive/Desktop/comps/levels/one.lvl", this->Width, this->Height / 2);
    //ProjectionLevel two; two.Load("levels/two.lvl", this->Width, this->Height / 2);
    //ProjectionLevel three; three.Load("levels/three.lvl", this->Width, this->Height / 2);
    //ProjectionLevel four; four.Load("levels/four.lvl", this->Width, this->Height / 2);
    this->Levels.push_back(one);
    //this->Levels.push_back(two);
    //this->Levels.push_back(three);
    //this->Levels.push_back(four);
    this->Level = 0;

    glm::vec2 playerPos = glm::vec2(
        this->Width / 2.0f - PLAYER_SIZE.x / 2.0f,
        this->Height - PLAYER_SIZE.y
        );
    Player = new GameObject(playerPos, PLAYER_SIZE, ResourceManager::GetTexture("hand_paddle"));

    glm::vec2 ballPos = playerPos + glm::vec2(PLAYER_SIZE.x / 2.0f - BALL_RADIUS,
        -BALL_RADIUS * 2.0f);
    
    for (int i = 0; i < number_of_circles; i++) {
        glm::vec2 BALL_VELOCITY((i / 25.0f) + 0.1f, (i / -25.f) + 0.1f);
        circles[i] = new CircleObject(ballPos, BALL_RADIUS, BALL_VELOCITY, //INITIAL_BALL_VELOCITY,
            ResourceManager::GetTexture("circle"));
    }
    
}

void Projection::Update(float dt)
{   
    // do this for all the circles
    for (int i = 0; i < number_of_circles; i++) {
        circles[i]->Move(dt, this->Width, this->Height);
    }
}

void Projection::ProcessInput(GLFWwindow* window, float dt) // add window 
{   // handles user input, rn keyboard activated, need to figure out how to make it webcam activated.

    if (this->State == PROJECTION_ACTIVE)
    {
        float velocity = PLAYER_VELOCITY * dt;
        // move playerboard
        //std::cout << velocity << std::endl;
        glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS;
        if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS)//(this->Keys[GLFW_KEY_A])
        {   
            std::cout << "A" << std::endl;
            if (Player->Position.x >= 0.0f)
            {
                std::cout << "AND less than extreme" << std::endl;
                Player->Position.x -= velocity;
            }
        }
        if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS)//(this->Keys[GLFW_KEY_D])
        {
            std::cout << "D" << std::endl;
            if (Player->Position.x <= this->Width - Player->Size.x)
            {
                std::cout << Player->Position.x << std::endl;
                std::cout << this->Width << std::endl;
                std::cout << Player->Size.x << std::endl;
                Player->Position.x += velocity;
            }
        }
        if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS)//(this->Keys[GLFW_KEY_A])
        {
            std::cout << "W" << std::endl;
            if (Player->Position.y >= 0.0f)
            {
                std::cout << "AND less than extreme" << std::endl;
                Player->Position.y -= velocity;
            }
        }
        if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS)//(this->Keys[GLFW_KEY_D])
        {
            std::cout << "S" << std::endl;
            if (Player->Position.y <= this->Height - Player->Size.y)
            {
                std::cout << Player->Position.y << std::endl;
                std::cout << this->Height << std::endl;
                std::cout << Player->Size.y << std::endl;
                Player->Position.y += velocity;
            }
        }
        POINT p;
        if (GetCursorPos(&p))
        {
           //cursor position now in p.x and p.y
        }
        
        //if (ScreenToClient(&p)) // screen relative not just entire screen
        //{
            //p.x and p.y are now relative to hwnd's client area
        //}

        // 
    }
}

bool CheckCollision(GameObject& one, GameObject& two) // AABB - AABB collision
{
    // collision x-axis?
    bool collisionX = one.Position.x + one.Size.x >= two.Position.x &&
        two.Position.x + two.Size.x >= one.Position.x;
    // collision y-axis?
    bool collisionY = one.Position.y + one.Size.y >= two.Position.y &&
        two.Position.y + two.Size.y >= one.Position.y;
    // collision only if on both axes
    return collisionX && collisionY;
}

void Projection::DoCollisions()
{
    for (int i = 0; i< number_of_circles i++;)
    {
        if (!circle.Destroyed)
        {
            if (CheckCollision(*Player, circle))
            {
                if (!circle.IsSolid)
                    circle.Destroyed = true;
            }
        }
    }
}

void Projection::Render()
{
    //Texture2D myTexture;
    //myTexture = ResourceManager::GetTexture("circle");
    //Renderer->DrawSprite(myTexture, glm::vec2(200, 200), glm::vec2(300, 400), 45.0f, glm::vec3(0.0f, 1.0f, 0.0f));

    if (this->State == PROJECTION_ACTIVE)
    {
        // draw background rn just black
        //Renderer->DrawSprite(ResourceManager::GetTexture("background"),
        //    glm::vec2(0.0f, 0.0f), glm::vec2(this->Width, this->Height), 0.0f
        //    );
        // draw level
        this->Levels[this->Level].Draw(*Renderer);
        Player->Draw(*Renderer);

        for (int i = 0; i < number_of_circles; i++) {
            circles[i]->Draw(*Renderer);
        }
    }
}