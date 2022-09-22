// copied from https://learnopengl.com/code_viewer_gh.php?code=src/1.getting_started/5.1.transformations/5.1.transform.fs
#version 330 core
out vec4 FragColor;

in vec3 ourColor;
in vec2 TexCoord;

// texture sampler
uniform sampler2D texture1;

void main()
{
	FragColor = texture(texture1, TexCoord);
}