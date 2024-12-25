"use client"
import React, { useEffect, useRef } from 'react';
import { NextPage } from 'next';
import AgoraRTC, {
  ILocalTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  UID,
} from 'agora-rtc-sdk-ng';

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const TOKEN = null;
const CHANNEL = 'test-channel'; // use any string you like

const VideoCallPage: NextPage = () => {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  
  // Agora client instance
  const clientRef = useRef<IAgoraRTCClient | null>(null);

  // Local tracks
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Create Agora client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // 2. Join a channel
      try {
        await client.join('de4a172046e34377a8afac7458c1e772', CHANNEL, TOKEN, null);
        console.log('Joined channel successfully');

        // 3. Create and publish local tracks
        const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        
        localAudioTrackRef.current = microphoneTrack;
        localVideoTrackRef.current = cameraTrack;
        
        // Play local video on your page
        if (localVideoRef.current) {
          cameraTrack.play(localVideoRef.current);
        }

        // Publish local tracks to the channel
        await client.publish([microphoneTrack, cameraTrack]);
        console.log('Local tracks published');

      } catch (error) {
        console.error('Failed to join the channel', error);
      }

      // 4. Subscribe and play remote tracks
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        console.log('Subscribed to remote user:', user.uid);

        if (mediaType === 'video') {
          const remoteVideoTrack = user.videoTrack as IRemoteVideoTrack;
          // Play the remote video in remoteVideoRef
          if (remoteVideoRef.current) {
            remoteVideoTrack.play(remoteVideoRef.current);
          }
        }

        if (mediaType === 'audio') {
          const remoteAudioTrack = user.audioTrack as IRemoteAudioTrack;
          remoteAudioTrack.play(); // just play audio
        }
      });

      // 5. Handle remote user leaving
      client.on('user-unpublished', (user, mediaType) => {
        console.log('User unpublished', user.uid, mediaType);
        // Optionally stop playing tracks if needed
      });
    };

    // Initialize the call
    init();

    // Cleanup: leave the channel, close tracks
    return () => {
      const cleanup = async () => {
        if (clientRef.current) {
          try {
            if (localAudioTrackRef.current) {
              localAudioTrackRef.current.close();
              localAudioTrackRef.current = null;
            }
            if (localVideoTrackRef.current) {
              localVideoTrackRef.current.close();
              localVideoTrackRef.current = null;
            }
            await clientRef.current.leave();
            console.log('Left the channel');
          } catch (error) {
            console.error('Error leaving the channel', error);
          }
        }
      };
      cleanup();
    };
  }, []);

  return (
    <div style={{ display: 'flex', gap: '1rem', margin: '2rem' }}>
      <div>
        <h2>Local Video</h2>
        <div
          ref={localVideoRef}
          style={{
            width: '400px',
            height: '300px',
            backgroundColor: '#000',
          }}
        ></div>
      </div>
      <div>
        <h2>Remote Video</h2>
        <div
          ref={remoteVideoRef}
          style={{
            width: '400px',
            height: '300px',
            backgroundColor: '#000',
          }}
        ></div>
      </div>
    </div>
  );
};

export default VideoCallPage;
