import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ChevronRightIcon({ color = "#B3B3B3", size = { width: 4, height: 7 } }) {
  return (
    <Svg width={size.width} height={size.height} viewBox="0 0 4 7" fill="none">
      <Path 
        d="M0.375025 0.375C0.375025 0.375 3.375 2.58445 3.375 3.375C3.375 4.1656 0.375 6.375 0.375 6.375" 
        stroke={color} 
        strokeWidth="0.75" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </Svg>
  );
}
