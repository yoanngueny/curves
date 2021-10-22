import { Vector3, Triangle } from "three";

/**
 * Sets these points from the buffer geometry quads center.
 * @param  geometry the source buffer geometry
 * @param  points   the result will be copied into this vector3 array
 * @param  add      Adds to each point vector
 */
export const pointsFromBufferGeometry = function (
  geometry,
  points,
  add = null
) {
  let triangle1 = new Triangle(),
    triangle2 = new Triangle(),
    midpoint1 = new Vector3(),
    midpoint2 = new Vector3(),
    quadCenter = new Vector3();
  for (let i = 0, len = geometry.index.count; i < len; i += 6) {
    quadCenterFromBufferGeometry(
      geometry,
      i,
      quadCenter,
      triangle1,
      triangle2,
      midpoint1,
      midpoint2
    );
    if (add) quadCenter.add(add);
    points.push(quadCenter.clone());
  }
};

/**
 * Sets this quad center vector from the buffer geometry.
 * @param  geometry   the source buffer geometry
 * @param  indexStart the first index of the quad
 * @param  quadCenter the result will be copied into this vector3
 * @param  triangle1  the first triangle result will be copied into this triangle
 * @param  triangle2  the second triangle result will be copied into this triangle
 * @param  midpoint1  the first mid point result will be copied into this vector3
 * @param  midpoint2  the second mid point result will be copied into this vector3
 * @return            [description]
 */
export const quadCenterFromBufferGeometry = function (
  geometry,
  indexStart,
  quadCenter,
  triangle1,
  triangle2,
  midpoint1,
  midpoint2
) {
  triangleFromBufferGeometry(geometry, indexStart, triangle1);
  triangleFromBufferGeometry(geometry, indexStart + 3, triangle2);
  // calculate triangles midpoints
  triangle1.getMidpoint(midpoint1);
  triangle2.getMidpoint(midpoint2);
  // calculate midpoints center
  quadCenter.lerpVectors(midpoint1, midpoint2, 0.5);
};

/**
 * Sets this triangle's a, b and c vectors from the buffer geometry.
 * @param geometry   the source buffer geometry
 * @param indexStart the first index of the triangle
 * @param triangle   the result will be copied into this triangle
 */
export const triangleFromBufferGeometry = function (
  geometry,
  indexStart,
  triangle
) {
  triangle.a.fromBufferAttribute(
    geometry.attributes.position,
    geometry.index.array[indexStart]
  );
  triangle.b.fromBufferAttribute(
    geometry.attributes.position,
    geometry.index.array[indexStart + 1]
  );
  triangle.c.fromBufferAttribute(
    geometry.attributes.position,
    geometry.index.array[indexStart + 2]
  );
};
