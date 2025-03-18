import React from 'react';
import Lottie from 'react-lottie';
import loadingAnimation from '../assets/loading-animation.json';
import './LoadingAnimation.css';

const LoadingAnimation = ({ message = "Loading..." }) => {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loadingAnimation,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  return (
    <div className="loading-container">
      <Lottie 
        options={defaultOptions}
        height={200}
        width={200}
      />
      <p>{message}</p>
    </div>
  );
};

export default LoadingAnimation;