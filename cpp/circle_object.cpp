/******************************************************************
** This code is part of Breakout.
**
** Breakout is free software: you can redistribute it and/or modify
** it under the terms of the CC BY 4.0 license as published by
** Creative Commons, either version 4 of the License, or (at your
** option) any later version.
******************************************************************/
#include "circle_object.h"


CircleObject::CircleObject()
    : GameObject(), Radius(12.5f), Attracted_To_Hand(false) { }

CircleObject::CircleObject(glm::vec2 pos, float radius, glm::vec2 velocity, Texture2D sprite)
    : GameObject(pos, glm::vec2(radius * 2.0f, radius * 2.0f), sprite, glm::vec3(1.0f), velocity), Radius(radius), Attracted_To_Hand(false){ }

glm::vec2 CircleObject::Move(float dt, unsigned int window_width, unsigned int window_height)
{
    if (!this->Attracted_To_Hand)
    {
        // move the circle
        this->Position += this->Velocity * dt;
        // then check if outside window bounds and if so, reverse velocity and restore at correct position
        if (this->Position.x <= 0.0f)
        {
            this->Velocity.x = -this->Velocity.x;
            this->Position.x = 0.0f;
        }
        else if (this->Position.x + this->Size.x >= window_width)
        {
            this->Velocity.x = -this->Velocity.x;
            this->Position.x = window_width - this->Size.x;
        }
        if (this->Position.y <= 0.0f)
        {
            this->Velocity.y = -this->Velocity.y;
            this->Position.y = 0.0f;
        }
        else if (this->Position.y + this->Size.y >= window_height)
        {
            this->Velocity.y = -this->Velocity.y;
            this->Position.y = window_height - this->Size.y;
        }
        
    }
    // else be attracted
    return this->Position;
}

// resets the circles to initial floating position (the player has left the view)
void CircleObject::Reset(glm::vec2 position, glm::vec2 velocity)
{
    this->Position = position;
    this->Velocity = velocity;
    this->Attracted_To_Hand = true;
}