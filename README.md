#  Lava Lamp Visual

🌐 Live demo:  
 https://sequeradev.github.io/lava_lamp/

---

## 🛠 Tech

- Vite + TypeScript
- WebGL (GLSL shaders)
- GitHub Pages auto-deploy

---

## 🎨 Customization

You can easily modify the lava appearance in the fragment shader.

### Change lava color

Open:

src/main.ts

css
Copiar código

Find the color definition (similar to):

```glsl
vec3 lavaColor = vec3(1.0, 0.45, 0.05);
Examples:

🔥 Deep orange

glsl
Copiar código
vec3 lavaColor = vec3(1.0, 0.35, 0.05);
💜 Purple lava

glsl
Copiar código
vec3 lavaColor = vec3(0.7, 0.2, 1.0);
💚 Neon green

glsl
Copiar código
vec3 lavaColor = vec3(0.2, 1.0, 0.4);
