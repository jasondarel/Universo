import React from "react";
import StarComponent from "./StarComponent";
import PlanetComponent from "./PlanetComponent";
import NebulaComponent from "./NebulaComponent";
import BlackHoleComponent from "./BlackHoleComponent";
import DeathStarComponent from "./DeathStarComponent";

function CelestialObject({ object, onClick, onRegisterSun }) {
  // Route to appropriate component based on object type
  switch (object.type) {
    case "star":
      return (
        <StarComponent
          object={object}
          onClick={onClick}
          onRegisterSun={onRegisterSun}
        />
      );
    case "planet":
      return <PlanetComponent object={object} onClick={onClick} />;
    case "nebula":
      return <NebulaComponent object={object} onClick={onClick} />;
    case "black_hole":
      return <BlackHoleComponent object={object} onClick={onClick} />;
    case "deathstar":
      return <DeathStarComponent object={object} onClick={onClick} />;
    default:
      return <PlanetComponent object={object} onClick={onClick} />;
  }
}

export default CelestialObject;
