import React from 'react';
import './App.css';

const ImageStack = ({ src, opacity = 1, style = {}, count = 3 }) => {
    const layers = Array.from({ length: count }, (_, i) => i);
  
    return (
    <div style={{...style,}}>
      <div style={{ position: 'relative', width: 'fit-content', height: 'fit-content'}}>
        {layers.map(i => {
          const scale = 1 - i * 0.1;
          return (
            <img
              key={i}
              src={src}
              alt={`layer-${i}`}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: 'center center',
                zIndex: 0 -count + i,
                pointerEvents: 'none', // <- merge custom styles
                opacity: opacity
              }}
            />
          );
        })}
      </div>
      </div>
    );
  };
  

export default ImageStack;