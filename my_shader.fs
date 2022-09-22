// copied from https://learnopengl.com/code_viewer_gh.php?code=src/1.getting_started/3.3.shaders_class/3.3.shader.fs
#version 330 core
out vec4 FragColor;

in vec3 ourColor;

void main()
{
    FragColor = vec4(ourColor, 1.0f);
}