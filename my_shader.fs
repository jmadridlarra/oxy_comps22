// copied from https://learnopengl.com/code_viewer_gh.php?code=src/1.getting_started/5.1.transformations/5.1.transform.fs
#version 330 core
out vec4 FragColor;

in vec3 ourColor;
in vec2 TexCoord;

uniform sampler2D texture1;
uniform sampler2D texture2;

void main()
{
    FragColor = mix(texture(texture1, TexCoord), texture(texture2, TexCoord), 0.2);
}