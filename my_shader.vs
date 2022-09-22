// copied from https://learnopengl.com/code_viewer_gh.php?code=src/1.getting_started/3.3.shaders_class/3.3.shader.vs
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aColor;

out vec3 ourColor;

void main()
{
    gl_Position = vec4(aPos, 1.0);
    ourColor = aColor;
}