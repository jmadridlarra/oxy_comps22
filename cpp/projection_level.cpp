/*******************************************************************
** This code is part of Breakout.
**
** Breakout is free software: you can redistribute it and/or modify
** it under the terms of the CC BY 4.0 license as published by
** Creative Commons, either version 4 of the License, or (at your
** option) any later version.
******************************************************************/
#include "projection_level.h"

#include <fstream>
#include <sstream>


void ProjectionLevel::Load(const char* file, unsigned int levelWidth, unsigned int levelHeight)
{
    // clear old data
    this->Circles.clear();
    // load from file
    unsigned int circleCode;
    ProjectionLevel level;
    std::string line;
    std::ifstream fstream(file);
    std::vector<std::vector<unsigned int>> circleData;
    if (fstream)
    {
        while (std::getline(fstream, line)) // read each line from level file
        {
            std::istringstream sstream(line);
            std::vector<unsigned int> row;
            while (sstream >> circleCode) // read each word separated by spaces
                row.push_back(circleCode);
            circleData.push_back(row);
        }
        if (circleData.size() > 0)
            this->init(circleData, levelWidth, levelHeight);
    }
}

void ProjectionLevel::Draw(SpriteRenderer& renderer)
{
    for (GameObject& circle : this->Circles)
        if (!circle.Destroyed)
            circle.Draw(renderer);
}

bool ProjectionLevel::IsCompleted()
{
    for (GameObject& circle : this->Circles)
        if (!circle.Destroyed)
            return false;
    return true;
}

bool ProjectionLevel::PlayerHasEntered()
{
    // if we detect hands, player has entered
    // if we don't detect hands no players exist. 
    return true;
}

void ProjectionLevel::init(std::vector<std::vector<unsigned int>> circleData, unsigned int levelWidth, unsigned int levelHeight)
{
    // calculate dimensions
    unsigned int height = circleData.size();
    unsigned int width = circleData[0].size(); // note we can index vector at [0] since this function is only called if height > 0
    float unit_width = levelWidth / static_cast<float>(width), unit_height = levelHeight / height;
    // initialize level tiles based on tileData		
    for (unsigned int y = 0; y < height; ++y)
    {
        for (unsigned int x = 0; x < width; ++x)
        {
            // check block type from level data (2D level array)
            /*
            if (circleData[y][x] == 1) // solid
            {
                glm::vec2 pos(unit_width * x, unit_height * y);
                glm::vec2 size(unit_width, unit_height);
                GameObject obj(pos, size, ResourceManager::GetTexture("block_solid"), glm::vec3(0.8f, 0.8f, 0.7f));
                obj.IsSolid = true;
                this->Circles.push_back(obj);
            }
            */
            if (circleData[y][x] > 1)	// determine its color based on level data
            {
                glm::vec3 color = glm::vec3(1.0f); // original: white
                if (circleData[y][x] == 2)
                    color = glm::vec3(0.2f, 0.6f, 1.0f);
                else if (circleData[y][x] == 3)
                    color = glm::vec3(0.0f, 0.7f, 0.0f);
                else if (circleData[y][x] == 4)
                    color = glm::vec3(0.8f, 0.8f, 0.4f);
                else if (circleData[y][x] == 5)
                    color = glm::vec3(1.0f, 0.5f, 0.0f);

                glm::vec2 pos(unit_width * x, unit_height * y);
                glm::vec2 size(unit_width, unit_height);
                // don't render background "blocks" instead use CircleObject
                //this->Circles.push_back(GameObject(pos, size, ResourceManager::GetTexture("circle"), color));
            }
        }
    }
}