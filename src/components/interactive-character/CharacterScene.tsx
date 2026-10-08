import characterAsset from "../../../assets/heroes/web/shape-lab-alt.webp";
import { LensReflection } from "./LensReflection";

const layerImageProps = {
  src: characterAsset,
  alt: "",
  draggable: false,
} as const;

export function CharacterScene() {
  return (
    <div className="sg-character-scene" aria-hidden="true">
      <div className="sg-character-scene__scroll">
        <div className="sg-character-scene__body-response">
          <div className="sg-character-scene__breath">
            <div className="sg-character-scene__crop">
              <div className="sg-character-layer sg-character-layer--body">
                <img
                  {...layerImageProps}
                  className="sg-character-layer__image"
                  decoding="async"
                  loading="eager"
                />
              </div>

              <div className="sg-character-layer sg-character-layer--head">
                <img {...layerImageProps} className="sg-character-layer__image" decoding="async" />
              </div>

              <div className="sg-character-layer sg-character-layer--eyewear">
                <img {...layerImageProps} className="sg-character-layer__image" decoding="async" />
                <LensReflection />
              </div>

              <div className="sg-character-scene__rim" />
              <div className="sg-character-scene__vignette" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
