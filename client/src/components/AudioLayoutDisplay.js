import React from 'react';

function AudioLayoutDisplay({ videoInfo, activeAudioTrack, onAudioTrackSelect }) {
  if (!videoInfo || !videoInfo.audioStreams || videoInfo.audioStreams.length === 0) {
    return (
      <div style={{
        padding: '0.5rem',
        backgroundColor: '#2a2a2a',
        borderRadius: '4px',
        color: '#888',
        fontSize: '0.85rem',
        textAlign: 'center'
      }}>
        No audio tracks detected
      </div>
    );
  }

  // Check if mono streams were combined
  const hasMonoCombination = videoInfo.monoStreamCombinations && 
                             videoInfo.monoStreamCombinations.canCombineFirstTwo;

  const formatBitrate = (bitrate) => {
    if (!bitrate) return 'Unknown';
    const kbps = Math.round(bitrate / 1000);
    return `${kbps} kbps`;
  };

  const formatSampleRate = (sampleRate) => {
    if (!sampleRate) return 'Unknown';
    if (sampleRate >= 1000) {
      return `${(sampleRate / 1000).toFixed(1)} kHz`;
    }
    return `${sampleRate} Hz`;
  };

  const getChannelLayoutDisplay = (channelLayout, channels) => {
    if (channelLayout && channelLayout !== 'unknown') {
      return channelLayout;
    }
    if (channels) {
      return `${channels} channel${channels > 1 ? 's' : ''}`;
    }
    return 'Unknown layout';
  };

  const isStreamActive = (streamIndex) => {
    if (!activeAudioTrack) {
      // If no active track detected, assume first stream is active
      return streamIndex === 0;
    }
    
    // For HLS or native tracks, use the detected index
    if (activeAudioTrack.source === 'hls' || activeAudioTrack.source === 'native') {
      return streamIndex === activeAudioTrack.index;
    }
    
    // For assumed tracks, usually the first stream
    return streamIndex === 0;
  };

  return (
    <div style={{
      padding: '0.75rem',
      backgroundColor: '#2a2a2a',
      borderRadius: '4px',
      marginTop: '0.5rem'
    }}>
      <div style={{
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span>🔊</span>
        Audio Layout
        <span style={{ 
          fontSize: '0.8rem', 
          fontWeight: 'normal',
          color: '#888'
        }}>
          ({videoInfo.audioStreams.length} stream{videoInfo.audioStreams.length > 1 ? 's' : ''})
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {hasMonoCombination && (
          // Show combined stereo track first
          <div
            key="combined-stereo"
            style={{
              padding: '0.5rem',
              backgroundColor: isStreamActive(0) ? '#2a4d3a' : '#3a3a3a',
              borderRadius: '3px',
              fontSize: '0.8rem',
              border: isStreamActive(0) ? '2px solid #4ade80' : '2px solid transparent',
              position: 'relative',
              cursor: onAudioTrackSelect ? 'pointer' : 'default',
              transition: 'all 0.2s ease'
            }}
            onClick={() => onAudioTrackSelect && onAudioTrackSelect(0)}
            title="Combined stereo track from mono streams"
          >
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center'
            }}>
              <span style={{ 
                color: isStreamActive(0) ? '#4ade80' : '#4a9eff', 
                fontWeight: 'bold',
                minWidth: 'fit-content',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                {isStreamActive(0) && <span style={{ color: '#4ade80' }}>▶</span>}
                {videoInfo.monoStreamCombinations.resultTitle}
                {isStreamActive(0) && <span style={{ 
                  fontSize: '0.7rem', 
                  color: '#4ade80',
                  fontWeight: 'normal' 
                }}>(ACTIVE)</span>}
              </span>
              
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                color: '#ccc'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ color: '#888' }}>Layout:</span>
                  <strong>stereo</strong>
                  <span style={{ 
                    color: '#ff9500', 
                    fontSize: '0.7rem',
                    backgroundColor: '#332200',
                    padding: '0.1rem 0.3rem',
                    borderRadius: '2px'
                  }}>COMBINED</span>
                </span>
              </div>
            </div>
          </div>
        )}
        
        {videoInfo.audioStreams.map((stream, index) => {
          // Skip mono streams that were combined
          if (hasMonoCombination) {
            const combo = videoInfo.monoStreamCombinations;
            if (index === combo.stream1Index || index === combo.stream2Index) {
              return null;
            }
          }
          
          // Adjust stream index for display (account for combined track)
          const displayIndex = hasMonoCombination ? 
            (index > Math.max(videoInfo.monoStreamCombinations.stream1Index, videoInfo.monoStreamCombinations.stream2Index) ? 
              index - 1 : index) + 1 : index;
          
          const isActive = isStreamActive(displayIndex);
          return (
            <div
              key={index}
              style={{
                padding: '0.5rem',
                backgroundColor: isActive ? '#2a4d3a' : '#3a3a3a',
                borderRadius: '3px',
                fontSize: '0.8rem',
                border: isActive ? '2px solid #4ade80' : '2px solid transparent',
                position: 'relative',
                cursor: onAudioTrackSelect ? 'pointer' : 'default',
                transition: 'all 0.2s ease'
              }}
              onClick={() => onAudioTrackSelect && onAudioTrackSelect(displayIndex)}
              onMouseEnter={(e) => {
                if (onAudioTrackSelect && !isActive) {
                  e.target.style.backgroundColor = '#4a4a4a';
                }
              }}
              onMouseLeave={(e) => {
                if (onAudioTrackSelect && !isActive) {
                  e.target.style.backgroundColor = '#3a3a3a';
                }
              }}
              title={onAudioTrackSelect && !isActive ? 'Click to select this audio stream' : isActive ? 'Currently active audio stream' : ''}
            >
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center'
            }}>
              <span style={{ 
                color: isActive ? '#4ade80' : '#4a9eff', 
                fontWeight: 'bold',
                minWidth: 'fit-content',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                {isActive && <span style={{ color: '#4ade80' }}>▶</span>}
                Stream {displayIndex + 1}
                {isActive && <span style={{ 
                  fontSize: '0.7rem', 
                  color: '#4ade80',
                  fontWeight: 'normal' 
                }}>(ACTIVE)</span>}
              </span>
              
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                color: '#ccc'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ color: '#888' }}>Layout:</span>
                  <strong>{getChannelLayoutDisplay(stream.channelLayout, stream.channels)}</strong>
                </span>
                
                {stream.codec && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ color: '#888' }}>Codec:</span>
                    <strong>{stream.codec}</strong>
                  </span>
                )}
                
                {stream.sampleRate && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ color: '#888' }}>Rate:</span>
                    <strong>{formatSampleRate(stream.sampleRate)}</strong>
                  </span>
                )}
                
                {stream.bitRate && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ color: '#888' }}>Bitrate:</span>
                    <strong>{formatBitrate(stream.bitRate)}</strong>
                  </span>
                )}
                
                {stream.bitsPerSample && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ color: '#888' }}>Depth:</span>
                    <strong>{stream.bitsPerSample}-bit</strong>
                  </span>
                )}
              </div>
            </div>
            
            {(stream.language || stream.title) && (
              <div style={{
                marginTop: '0.25rem',
                display: 'flex',
                gap: '0.75rem',
                fontSize: '0.75rem',
                color: '#999'
              }}>
                {stream.language && (
                  <span>Language: {stream.language}</span>
                )}
                {stream.title && (
                  <span>Title: {stream.title}</span>
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AudioLayoutDisplay;