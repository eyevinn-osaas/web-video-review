import React, { useRef, useEffect, useState } from 'react';

function AudioGoniometer({ 
  visible = false, 
  size = 200, 
  position = { x: 20, y: 20 },
  onPositionChange,
  onClose,
  videoRef = null // Accept videoRef as prop to ensure we get the right element
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const splitterRef = useRef(null);
  const leftAnalyserRef = useRef(null);
  const rightAnalyserRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!visible) {
      cleanup();
      return;
    }

    // Add a small delay to ensure video is ready
    const initTimer = setTimeout(() => {
      initializeAudioAnalysis();
      startVisualization();
    }, 500);

    return () => {
      clearTimeout(initTimer);
      cleanup();
    };
  }, [visible]);

  const initializeAudioAnalysis = async () => {
    try {
      // Get the video element to connect to
      const videoElement = videoRef?.current || document.querySelector('video');
      if (!videoElement) {
        console.warn('[Goniometer] No video element found');
        return;
      }

      console.log('[Goniometer] Found video element:', videoElement);
      console.log('[Goniometer] Video src:', videoElement.src || videoElement.currentSrc);
      console.log('[Goniometer] Video ready state:', videoElement.readyState);
      console.log('[Goniometer] Video paused:', videoElement.paused);

      // Check if video has audio and is not muted
      if (videoElement.muted) {
        console.warn('[Goniometer] Video is muted, unmuting for analysis');
        videoElement.muted = false;
      }

      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Resume audio context if it's suspended (required by browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[Goniometer] AudioContext resumed');
      }

      // Check if the video element already has a media source connected
      let source;
      try {
        source = audioContext.createMediaElementSource(videoElement);
      } catch (error) {
        console.error('[Goniometer] Error creating media source (might already be connected):', error);
        
        // Alternative approach: use getUserMedia or check if MediaSource is already created
        if (error.name === 'InvalidStateError') {
          console.log('[Goniometer] Video element already has a MediaElementAudioSourceNode, trying alternative approach');
          
          // Create a gain node to tap into existing audio
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 1.0;
          
          // Try to connect to the video's audio destination
          try {
            // This is a workaround - we'll simulate the analysis
            const leftAnalyser = audioContext.createAnalyser();
            const rightAnalyser = audioContext.createAnalyser();
            
            leftAnalyser.fftSize = 1024;
            rightAnalyser.fftSize = 1024;
            leftAnalyser.smoothingTimeConstant = 0.3;
            rightAnalyser.smoothingTimeConstant = 0.3;
            
            leftAnalyserRef.current = leftAnalyser;
            rightAnalyserRef.current = rightAnalyser;
            
            // Connect to a dummy source for now - this needs improvement
            const oscillator = audioContext.createOscillator();
            oscillator.frequency.value = 0; // Silent
            oscillator.connect(leftAnalyser);
            oscillator.connect(rightAnalyser);
            oscillator.start();
            
            setIsConnected(true);
            console.log('[Goniometer] Using alternative audio connection method');
            return;
          } catch (altError) {
            console.error('[Goniometer] Alternative method failed:', altError);
          }
        }
        
        setIsConnected(false);
        return;
      }
      
      // Create channel splitter for left/right separation
      const splitter = audioContext.createChannelSplitter(2);
      splitterRef.current = splitter;

      // Create analysers for left and right channels
      const leftAnalyser = audioContext.createAnalyser();
      const rightAnalyser = audioContext.createAnalyser();
      
      leftAnalyser.fftSize = 1024; // Increased for better resolution
      rightAnalyser.fftSize = 1024;
      leftAnalyser.smoothingTimeConstant = 0.3;
      rightAnalyser.smoothingTimeConstant = 0.3;
      
      leftAnalyserRef.current = leftAnalyser;
      rightAnalyserRef.current = rightAnalyser;

      // Connect the audio graph
      source.connect(splitter);
      splitter.connect(leftAnalyser, 0);  // Left channel
      splitter.connect(rightAnalyser, 1); // Right channel
      
      // Connect back to destination so audio still plays
      source.connect(audioContext.destination);

      setIsConnected(true);
      console.log('[Goniometer] Audio analysis initialized successfully');
      console.log('[Goniometer] AudioContext state:', audioContext.state);
      console.log('[Goniometer] Video element ready state:', videoElement.readyState);
      console.log('[Goniometer] Video element muted:', videoElement.muted);

      // Add event listeners to monitor video state
      const handleVideoPlay = () => {
        console.log('[Goniometer] Video started playing');
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
      };

      const handleVideoLoadedData = () => {
        console.log('[Goniometer] Video loaded data');
      };

      videoElement.addEventListener('play', handleVideoPlay);
      videoElement.addEventListener('loadeddata', handleVideoLoadedData);

      // Cleanup function to remove listeners
      return () => {
        videoElement.removeEventListener('play', handleVideoPlay);
        videoElement.removeEventListener('loadeddata', handleVideoLoadedData);
      };

    } catch (error) {
      console.error('[Goniometer] Failed to initialize audio analysis:', error);
      setIsConnected(false);
    }
  };

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
  };

  const startVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 20;

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, size, size);

      // Draw grid and axes
      drawGrid(ctx, centerX, centerY, radius);

      // Draw audio visualization if connected
      if (isConnected && leftAnalyserRef.current && rightAnalyserRef.current) {
        drawGoniometerData(ctx, centerX, centerY, radius);
      } else {
        // Draw "No Signal" indicator
        ctx.fillStyle = '#666';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO SIGNAL', centerX, centerY);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const drawGrid = (ctx, centerX, centerY, radius) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;

    // Draw circular grid
    for (let i = 1; i <= 3; i++) {
      const r = (radius * i) / 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    
    // Horizontal axis (Left-Right)
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Vertical axis (Mid-Side)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Draw diagonal lines for stereo field reference
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.7, centerY - radius * 0.7);
    ctx.lineTo(centerX + radius * 0.7, centerY + radius * 0.7);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.7, centerY + radius * 0.7);
    ctx.lineTo(centerX + radius * 0.7, centerY - radius * 0.7);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    
    ctx.fillText('L', centerX - radius - 10, centerY + 3);
    ctx.fillText('R', centerX + radius + 10, centerY + 3);
    ctx.fillText('M', centerX, centerY - radius - 5);
    ctx.fillText('S', centerX, centerY + radius + 15);
  };

  const drawGoniometerData = (ctx, centerX, centerY, radius) => {
    const leftAnalyser = leftAnalyserRef.current;
    const rightAnalyser = rightAnalyserRef.current;

    const bufferLength = leftAnalyser.frequencyBinCount;
    const leftData = new Float32Array(bufferLength);
    const rightData = new Float32Array(bufferLength);

    leftAnalyser.getFloatTimeDomainData(leftData);
    rightAnalyser.getFloatTimeDomainData(rightData);

    // Check if we have actual signal (not just silence)
    const leftSignalLevel = calculateRMS(leftData);
    const rightSignalLevel = calculateRMS(rightData);
    const hasSignal = leftSignalLevel > 0.001 || rightSignalLevel > 0.001;

    if (!hasSignal) {
      // Draw "NO SIGNAL" indicator
      ctx.fillStyle = '#666';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO SIGNAL', centerX, centerY);
      
      // Display signal levels for debugging
      ctx.fillStyle = '#444';
      ctx.font = '10px monospace';
      ctx.fillText(`L: ${leftSignalLevel.toFixed(4)}`, centerX, centerY + 15);
      ctx.fillText(`R: ${rightSignalLevel.toFixed(4)}`, centerX, centerY + 30);
      return;
    }

    // Draw goniometer trace
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;

    // Sample fewer points for performance, but ensure we get meaningful data
    const sampleStep = Math.max(1, Math.floor(bufferLength / 300));
    
    ctx.beginPath();
    let firstPoint = true;
    let pointsDrawn = 0;

    for (let i = 0; i < bufferLength; i += sampleStep) {
      const left = leftData[i] || 0;
      const right = rightData[i] || 0;

      // Skip points that are too close to zero (noise threshold)
      if (Math.abs(left) < 0.001 && Math.abs(right) < 0.001) {
        continue;
      }

      // Convert L/R to X/Y coordinates
      const x = centerX + (left * radius * 0.8);
      const y = centerY - (right * radius * 0.8);

      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
      pointsDrawn++;
    }

    if (pointsDrawn > 0) {
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Calculate and display correlation
    const correlation = calculateCorrelation(leftData, rightData);
    displayCorrelation(ctx, correlation, centerX, centerY, radius, leftSignalLevel, rightSignalLevel);
  };

  const calculateRMS = (data) => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  };

  const calculateCorrelation = (leftData, rightData) => {
    let sum = 0;
    let leftSquareSum = 0;
    let rightSquareSum = 0;
    let count = 0;

    for (let i = 0; i < leftData.length; i++) {
      const left = leftData[i];
      const right = rightData[i];
      
      sum += left * right;
      leftSquareSum += left * left;
      rightSquareSum += right * right;
      count++;
    }

    const denominator = Math.sqrt(leftSquareSum * rightSquareSum);
    return denominator > 0 ? sum / denominator : 0;
  };

  const displayCorrelation = (ctx, correlation, centerX, centerY, radius, leftLevel = 0, rightLevel = 0) => {
    // Display correlation value
    ctx.fillStyle = correlation > 0.5 ? '#00ff00' : correlation < -0.5 ? '#ff0000' : '#ffff00';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`φ: ${correlation.toFixed(2)}`, 5, size - 40);

    // Display stereo width indicator
    const width = Math.abs(correlation);
    const widthPercent = ((1 - width) * 100).toFixed(0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`W: ${widthPercent}%`, 5, size - 25);

    // Display signal levels
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`L: ${(leftLevel * 100).toFixed(1)}%`, 5, size - 10);
    ctx.fillText(`R: ${(rightLevel * 100).toFixed(1)}%`, 80, size - 10);

    // Draw correlation indicator on the edge
    if (!isNaN(correlation) && isFinite(correlation)) {
      const angle = Math.acos(Math.abs(Math.max(-1, Math.min(1, correlation))));
      const indicatorX = centerX + Math.cos(angle) * radius;
      const indicatorY = centerY;
      
      ctx.fillStyle = correlation > 0 ? '#00ff00' : '#ff0000';
      ctx.beginPath();
      ctx.arc(indicatorX, indicatorY, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const handleMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    };

    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size,
        height: size + 30,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid #333',
        borderRadius: '4px',
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div style={{
        height: '25px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        fontSize: '11px',
        color: '#ccc'
      }}>
        <span>🎯 Goniometer</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#ccc',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '0',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          display: 'block',
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }}
      />
    </div>
  );
}

export default AudioGoniometer;