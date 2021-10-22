import { LineBasicMaterial, Color } from 'three';

class LineGradientMaterial extends LineBasicMaterial {
  /**
   * [constructor description]
   */
  constructor({ time, scale, startColor, middleColor, endColor }) {
    super({
      transparent: true,
      depthTest: false,
      // depthWrite: false,
    });
    this.onBeforeCompile = function ( shader ) {
      shader.uniforms.time = { value: time };
      shader.uniforms.scale = { value: scale };
      shader.uniforms.startColor = { value: new Color(startColor) };
      shader.uniforms.middleColor = { value: new Color(middleColor) };
      shader.uniforms.endColor = { value: new Color(endColor) };
      shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `
          #include <common>
          attribute float percent;
          varying float vPercent;
        `)
        .replace('#include <uv_vertex>', `
          #include <uv_vertex>
          vPercent = percent;
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `
          #include <common>
          uniform float time;
          uniform float scale;
          uniform vec3 startColor;
          uniform vec3 middleColor;
          uniform vec3 endColor;
          varying float vPercent;
        `)
        .replace('#include <output_fragment>', `
          float percent = mod(vPercent * scale + time, 1.0);
          // float percent = vPercent;
          vec4 transparentColor4 = vec4(0.0, 0.0, 0.0, 0.0);
          vec4 testColor4 = vec4(vec3(0.0, 1.0, 0.0), diffuseColor.a);
          vec4 startColor4 = vec4(startColor, diffuseColor.a);
          vec4 middleColor4 = vec4(middleColor, diffuseColor.a);
          vec4 endColor4 = vec4(endColor, diffuseColor.a);
          gl_FragColor = vec4(
            mix(
              mix(
                mix(transparentColor4, startColor4, percent * 8.0),
                mix(startColor4, middleColor4, percent * 8.0 - 1.0),
                step(0.125, percent)
              ),
              mix(
                mix(middleColor4, endColor4, percent * 8.0 - 2.0),
                mix(endColor4, transparentColor4, percent * 8.0 - 3.0),
                step(0.375, percent)
              ),
              step(0.25, percent)
            )
          );
        `);
      this.shaderMaterial = shader;
    };
  }

  set time(value) {
    if (this.shaderMaterial)
      this.shaderMaterial.uniforms.time.value = value;
  }

  get time() {
    return this.shaderMaterial ? this.shaderMaterial.uniforms.time.value : 0;
  }

  set scale(value) {
    this.shaderMaterial.uniforms.scale.value = value;
  }

  set startColor(value) {
    this.shaderMaterial.uniforms.startColor.value.set(value);
  }

  set middleColor(value) {
    this.shaderMaterial.uniforms.middleColor.value.set(value);
  }

  set endColor(value) {
    this.shaderMaterial.uniforms.endColor.value.set(value);
  }
}
export default LineGradientMaterial;
