import React from "react";
import { Composition, registerRoot } from "remotion";
import { PoinconDemoVideo } from "./PoinconDemoVideo";

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PoinconDemo"
        component={PoinconDemoVideo}
        durationInFrames={720}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};

registerRoot(RemotionRoot);
