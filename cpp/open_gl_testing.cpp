#include <glad/glad.h> // function pointer manager 
#include <GLFW/glfw3.h>
#include <iostream> // to use cout stream
#include <C:/Users/joaqu/OneDrive/Desktop/comps/cpp/shader_s.h> // use our in house shader
#include <C:/Users/joaqu/OneDrive/Desktop/comps/cpp/projection.h>
#include <C:/Users/joaqu/OneDrive/Desktop/comps/cpp/resource_manager.h>
// to get coordinates
#include <windows.h>
#pragma comment(lib, "user32.lib")

//C:\Users\joaqu\source\repos\openGL_testing\openGL_testing\shader_s.h

// for image textures
// #define STB_IMAGE_IMPLEMENTATION
// #include "stb_image.h"

// for movement
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

void framebuffer_size_callback(GLFWwindow* window, int width, int height);
void processInput(GLFWwindow* window);

// settings
const unsigned int SCR_WIDTH = 800;
const unsigned int SCR_HEIGHT = 600;

Projection Art(SCR_WIDTH, SCR_HEIGHT);

int main()
{
    glfwInit(); // initializes glfw
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3); //initializes glfw window
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3); // threes correspond to 3.3 respectively to use version 3.3
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE); // core profile does not offer 
    // backwards compatability - allows for subset of features we need
    //glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE); // for mac users

    GLFWwindow* window = glfwCreateWindow(800, 600, "LearnOpenGL", NULL, NULL); // creates a glfwWindow struct pointer called window
                                                                                // the name of the window is "LearnOpenGL"
    // HWND glfwGetWin32Window(GLFWwindow * window); // used to get mouse pointer
    if (window == NULL)
    {
        std::cout << "Failed to create GLFW window" << std::endl; // sends error message to the stream
        glfwTerminate(); //terminates the window since it wasn't created correctly
        return -1; // standard error return
    }
    glfwMakeContextCurrent(window); // makes this current context the main context on our thread
    glfwSetFramebufferSizeCallback(window, framebuffer_size_callback); // registering our callback function

    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) // compiles the function pointers for this specific OS
    {
        std::cout << "Failed to initialize GLAD" << std::endl;
        return -1;
    }

    // initialize game
    // ---------------
    Art.Init();

    // deltaTime variables
    // -------------------
    float deltaTime = 1.0f;
    float lastFrame = 0.0f;
    // build and compile our shader program
    // ------------------------------------
    Shader ourShader = ResourceManager::LoadShader("../../../../OneDrive/Desktop/comps/cpp/my_shader.vs", "C:/Users/joaqu/OneDrive/Desktop/comps/cpp/my_shader.fs", nullptr, "test"); // you can name your shader files however you like

    // projection matrix allows us to use 0x800 0x600
    glm::mat4 projection = glm::ortho(0.0f, 800.0f, 600.0f, 0.0f, -1.0f, 1.0f);

    // set up vertex data (and buffer(s)) and configure vertex attributes
    // ------------------------------------------------------------------
    float vertices[] = {
        // positions          // colors           // texture coords
         0.005f,  0.1f, 0.0f,   0.0f, 0.0f, 0.0f,   1.0f, 1.0f,   // top right
         0.005f, -0.1f, 0.0f,   0.0f, 0.0f, 0.0f,   1.0f, 0.0f,   // bottom right
        -0.1f, -0.1f, 0.0f,   0.0f, 0.0f, 0.0f,   0.0f, 0.0f,   // bottom left
        -0.1f,  0.1f, 0.0f,   0.0f, 0.0f, 0.0f,   0.0f, 1.0f    // top left 
    };

    // a texture is an image, this assigns the image coords to the shape coords
    unsigned int indices[] = {
        0, 1, 3, // first triangle
        1, 2, 3  // second triangle
    };


    // load and create a texture 
    // -------------------------
    //unsigned int texture2; //, texture2;
    // texture 1
    // ---------
        /*
    glGenTextures(1, &texture1);
    glBindTexture(GL_TEXTURE_2D, texture1);
    // set the texture wrapping parameters
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);	// set texture wrapping to GL_REPEAT (default wrapping method)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
    // set texture filtering parameters
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    // load image, create texture and generate mipmaps
    
    stbi_set_flip_vertically_on_load(true); // tell stb_image.h to flip loaded texture's on the y-axis.
    // The FileSystem::getPath(...) is part of the GitHub repository so we can find files on any IDE/platform; replace it with your own image path.
    unsigned char* data = stbi_load("../../../../OneDrive/Desktop/comps/tex.jpg", &width, &height, &nrChannels, 0);
    if (data)
    {
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, width, height, 0, GL_RGB, GL_UNSIGNED_BYTE, data);
        glGenerateMipmap(GL_TEXTURE_2D);
    }
    else
    {
        std::cout << "Failed to load texture" << std::endl;
    }
    stbi_image_free(data);
    */
    // texture 2
    // ---------
    /*
    int width, height, nrChannels;
    glGenTextures(1, &texture2);
    glBindTexture(GL_TEXTURE_2D, texture2);
    // set the texture wrapping parameters
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);	// set texture wrapping to GL_REPEAT (default wrapping method)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    // set texture filtering parameters
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    // load image, create texture and generate mipmaps
    unsigned char* data = stbi_load("../../../../OneDrive/Desktop/comps/trans_circle.png", &width, &height, &nrChannels, 0);
    if (data)
    {
        // note that the awesomeface.png has transparency and thus an alpha channel, so make sure to tell OpenGL the data type is of GL_RGBA
        // to enable transparent background
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        // with alpha channel
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, data);
        glGenerateMipmap(GL_TEXTURE_2D);
    }
    else
    {
        std::cout << "Failed to load texture" << std::endl;
    }
    stbi_image_free(data);
    */
    // tell opengl for each sampler to which texture unit it belongs to (only has to be done once)
    // -------------------------------------------------------------------------------------------
    
    /*
    // shader
    unsigned int vertexShader;
    vertexShader = glCreateShader(GL_VERTEX_SHADER);

    glShaderSource(vertexShader, 1, &vertexShaderSource, NULL);
    glCompileShader(vertexShader);
    // checking shader compilation
    int  success;
    char infoLog[512];
    glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);

    if (!success)
    {
        glGetShaderInfoLog(vertexShader, 512, NULL, infoLog);
        std::cout << "ERROR::SHADER::VERTEX::COMPILATION_FAILED\n" << infoLog << std::endl;
    }

    // fragment shader
    unsigned int fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(fragmentShader, 1, &fragmentShaderSource, NULL);
    glCompileShader(fragmentShader);
    // check for shader compile errors
    glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
    if (!success)
    {
        glGetShaderInfoLog(fragmentShader, 512, NULL, infoLog);
        std::cout << "ERROR::SHADER::FRAGMENT::COMPILATION_FAILED\n" << infoLog << std::endl;
    }
    // link shaders
    unsigned int shaderProgram = glCreateProgram();
    glAttachShader(shaderProgram, vertexShader);
    glAttachShader(shaderProgram, fragmentShader);
    glLinkProgram(shaderProgram);
    // check for linking errors
    glGetProgramiv(shaderProgram, GL_LINK_STATUS, &success);
    if (!success) {
        glGetProgramInfoLog(shaderProgram, 512, NULL, infoLog);
        std::cout << "ERROR::SHADER::PROGRAM::LINKING_FAILED\n" << infoLog << std::endl;
    }
    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);
    */
    /*
    //triangle
    float vertices_tri[] = {
     0.5f,  0.5f, 0.0f,  // top right
     0.5f, -0.5f, 0.0f,  // bottom right
    -0.5f, -0.5f, 0.0f,  // bottom left
    -0.5f,  0.5f, 0.0f   // top left 
    };
    unsigned int indices[] = {  // note that we start from 0!
        0, 1, 3,   // first triangle
        1, 2, 3    // second triangle
    };
    */
    
    unsigned int VBO, VAO, EBO;
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);
    glGenBuffers(1, &EBO);

    glBindVertexArray(VAO);

    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

    // position attribute
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 8 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);
    // color attribute
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 8 * sizeof(float), (void*)(3 * sizeof(float)));
    glEnableVertexAttribArray(1);
    // texture coord attribute
    glVertexAttribPointer(2, 2, GL_FLOAT, GL_FALSE, 8 * sizeof(float), (void*)(6 * sizeof(float)));
    glEnableVertexAttribArray(2);

    ourShader.use(); // don't forget to activate the shader before setting uniforms!  
    //glUniform1i(glGetUniformLocation(ourShader.ID, "texture1"), 0); // set it manually
    //ourShader.setInt("texture2", 1); // or with shader class

    // render loop
    while (!glfwWindowShouldClose(window))
    {
        // input
        processInput(window);

        // rendering commands here
        glClearColor(0.2f, 0.3f, 0.3f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

        // draws triangle        
        ourShader.use();
        /*
        // circle
        GLfloat x, y, angle;
        glClear(GL_COLOR_BUFFER_BIT);
        glBegin(GL_POINTS);
        for (angle = 0.0f; angle <= (2.0f * GL_PI); angle += 0.01f)
        {
            x = 50.0f * sin(angle);
            y = 50.0f * cos(angle);
            glVertex3f(x, y, 0.0f);
        }
        */
       // glActiveTexture(GL_TEXTURE0);
        //glBindTexture(GL_TEXTURE_2D, texture1);
        //glActiveTexture(GL_TEXTURE1);
        //glBindTexture(GL_TEXTURE_2D, texture2);
        // applies transformation matrix
        glm::vec4 vec(1.0f, 0.0f, 0.0f, 1.0f);

        glm::mat4 trans = glm::mat4(1.0f);
        //trans = glm::translate(trans, (float)glfwGetTime(), glm::vec3(0.0001f, 0.0001f, 0.0f));
        //trans = glm::scale(trans, glm::vec3(0.5f, 0.5f, 0.5f));
        trans = glm::rotate(trans, (float)glfwGetTime(), glm::vec3(0.0f, 0.0f, 1.0f));

        //glm::mat4 trans = glm::mat4(0.5f);
        //trans = glm::rotate(trans, glm::radians(90.0f), glm::vec3(0.0, 0.0, 1.0));
        //trans = glm::scale(trans, glm::vec3(0.5, 0.5, 0.5));

        // send transformation info to the shader
        unsigned int transformLoc = glGetUniformLocation(ourShader.ID, "transform");
        glUniformMatrix4fv(transformLoc, 1, GL_FALSE, glm::value_ptr(trans));

        glBindVertexArray(VAO);
        glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);

        // check and call events and swap the buffers
        glfwPollEvents();
        
        // manage user input
        // -----------------
        Art.ProcessInput(window, deltaTime); // add window for cursor

        // update game state
        // -----------------
        Art.Update(deltaTime);

        // render
        // ------
        glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);
        Art.Render();

        glfwSwapBuffers(window);
    }

    glfwTerminate(); // clean allocated resources

    return 0;
}

void processInput(GLFWwindow* window) // processes user input - THIS IS WHERE WE WILL PUT JAVASCRIPT... I think
{
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
        glfwSetWindowShouldClose(window, true);
}

void framebuffer_size_callback(GLFWwindow* window, int width, int height) // resizes the viewport everytime the window is changed 
{
    glViewport(0, 0, width, height);
}



