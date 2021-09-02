import {geoCentroid as centroid, geoGnomonic as gnomonic} from "d3-geo";
import polyhedral from "./index.js";
import truncIco from "./truncico.js";

var spanTree = [
  1,-1,1,22,1,30,30,29,29,22,21,10,28,28,26,23,24,24,26,31,7,9,1,5,4,17,1,12,2,0,1,14
];
// spanTree[i] = d iff face i is children of face d

function isOnFace(p, face, faces) {
  // p: [long, lat] in degrees
  // face clock-wise list of vertices, in lat-long cooords
  // return true, or edge failing
  // see https://towardsdatascience.com/is-the-point-inside-the-polygon-574b86472119
  var xp = p[0];
  var yp = p[1];
  for (var i = 0, j = faces.length - 1; i < face.length; j = i++) {
    
    var x2 = face[i][0], y2 = face[i][1];
    var x1 = face[j][0], y1 = face[j][1];

    var intercept = (yp-y1)*(x2-x1)-(xp-x1)*(y2-y1);
    // >0: outside
    // <0: inside
    // =0: on the line
    if (intercept > 0) {
      return [face[i], face[j]];
    }
  }
  return true;
}

/**
 * Return face containing vertices [i,j] 
 */
function findFace(i, j, faces) {
  return faces.findIndex(face => {
    let fi = face.indexOf(i);
    let fj = face.indexOf(j);
    return fi >= 0 && fj >= 0 && (fi + 1 ) % face.length == fj;
  } );
}

/**
 * Return index of face containing p
 */
function chooseFace(p, faces) {
  let tested = [];
  let curFace = 0;
  while(tested.length < faces.length) {
    tested.push(curFace);
    let test = isOnFace(p, faces[curFace], faces); // FIXME ERRORE parametro curFace
    if (test === true) {
      return curFace;
    }
    // test=[a,b] failing edge
    // solution should be on face [b,a], I suppose
    curFace = findFace(test[1], test[0], faces);
    if (tested.indexOf(curFace) >= 0) {
      // what the fxxx?!?
      curFace = Object.keys(faces).find(x => tested.indexOf(x) < 0);
      if (curFace === undefined) {
        console.log('No solution ?!?')
        return faces[0]; // a random one. Do you really want to throw an exception?
      }
    }
  }
}

// https://github.com/substack/point-in-polygon/blob/master/nested.js
// e.g. pointInPolygon([0,0], [[0,1], [1,1], [1,0], [0,0]])
function pointInPolygon (point, vs) {
  var x = point[0], y = point[1];
  var inside = false;
  var len = vs.length;
  for (var i = 0, j = len - 1; i < len; j = i++) {
      var xi = vs[i][0], yi = vs[i][1];
      var xj = vs[j][0], yj = vs[j][1];
      var intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Projection on truncated icosahedron
 */
export default function(faceProjection) {

  faceProjection = faceProjection || function(face) {
    var c = centroid({type: "MultiPoint", coordinates: face});
    return gnomonic().scale(1).translate([0, 0]).rotate([-c[0], -c[1]]); // FIXME adjust
  };

  var faces = truncIco.map(function(face) {
    return {face: face, project: faceProjection(face)};
  });

  // making 'faces' a spanning tree
  spanTree.forEach(function(d, i) {
    var node = faces[d];
    node && (node.children || (node.children = [])).push(faces[i]);
  });

  return polyhedral(faces[0], function(lambda, phi) {
    let idx = chooseFace([lambda, phi], faces);
    return faces[idx];
  })
      .angle(-30)
      .scale(101.858)
      .center([0, 45]); // FIXME adjust
}
