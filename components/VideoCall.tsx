"use client"
import React, { useEffect, useState } from 'react';
import AgoraRTC, { 
    ClientConfig, 
    IAgoraRTCRemoteUser,
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { RemoteUser, useRemoteUsers } from "agora-rtc-react";

// Types
interface RemoteUsers {
    [key: string]: IAgoraRTCRemoteUser;
}

type TracksType = [IMicrophoneAudioTrack, ICameraVideoTrack] | [];

// Agora client configuration
const config: ClientConfig = {
    mode: 'rtc',
    codec: 'vp8'
};

const appId: string = 'de4a172046e34377a8afac7458c1e772';
const client = AgoraRTC.createClient(config);

const VideoCall: React.FC = () => {
    const [isJoined, setIsJoined] = useState<boolean>(false);
    const [localTracks, setLocalTracks] = useState<TracksType>([]);
    const [remoteUsers, setRemoteUsers] = useState<RemoteUsers>({});
    const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
    const [userId] = useState<string>(Math.random().toString(36).substring(2, 15));

    const join = async (channelName: string): Promise<void> => {
        try {
            const [microphone, camera] = await AgoraRTC.createMicrophoneAndCameraTracks();
            setLocalTracks([microphone, camera]);
            
            const token = '007eJxTYAg/cuXXxJkG13eldX9U0o+Q1t252zL4fvrZn1dKWWw/HrRWYEhJNUk0NDcyMDFLNTYxNjdPtEhMS0w2NzG1SDZMNTc32rw+O70hkJGhatVdZkYGCATxeRhKUotLdJMzEvPyUnMYGAABgySx'; // Replace with your dynamic token if needed
            await client.join(appId, channelName, token, userId);
            await client.publish([microphone, camera]);
            setIsJoined(true);
        } catch (error) {
            console.error('Error joining channel:', error);
        }
    };

    const leave = async (): Promise<void> => {
        try {
            localTracks.forEach((track) => track.close());
            await client.leave();
            setIsJoined(false);
            setRemoteUsers({});
            setLocalTracks([]);
        } catch (error) {
            console.error('Error leaving channel:', error);
        }
    };

    const toggleCamera = async () => {
        if (isCameraOn) {
            localTracks[1]?.setEnabled(false);
            localTracks[1]?.stop();
        } else {
            localTracks[1]?.setEnabled(true);
        }
        setIsCameraOn(!isCameraOn);
    };

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video' && user.videoTrack) {
            setRemoteUsers((prevUsers) => ({
                ...prevUsers,
                [user.uid]: user,
            }));
        }
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
        setRemoteUsers((prevUsers) => {
            const updatedUsers = { ...prevUsers };
            delete updatedUsers[user.uid];
            return updatedUsers;
        });
    };

    useEffect(() => {
        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);

        return () => {
            client.off('user-published', handleUserPublished);
            client.off('user-unpublished', handleUserUnpublished);
        };
    }, []);

    // Auto-join when component mounts
    useEffect(() => {
        join('test-channel');
        
        return () => {
            leave();
        };
    }, []);

    useEffect(() => {
        // Cleanup function for local tracks
        return () => {
            localTracks.forEach(track => track.stop());  // Stop tracks before leaving
            leave();
        };
    }, []);
    console.log(remoteUsers);
    

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Agora Video Call</h2>
            <button 
                onClick={toggleCamera} 
                className="mb-4 p-2 bg-blue-500 text-white rounded"
            >
                {isCameraOn ? 'Stop Camera' : 'Start Camera'}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localTracks.length > 0 && (
                    <div className="border p-4 rounded">
                        <h3 className="text-xl mb-2">You (ID: {userId})</h3>
                        {isCameraOn ? (
                            <div 
                                ref={(ref: HTMLDivElement | null) => {
                                    if (ref && localTracks[1]) {
                                        ref.innerHTML = '';
                                        localTracks[1].play(ref);
                                    }
                                }}
                                className="w-full h-[300px] md:h-[450px] bg-gray-100"
                            />
                        ) : (
                            <div className="w-full h-[300px] md:h-[450px] bg-gray-100 flex items-center justify-center">
                                <span>Camera Off</span>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="grid grid-cols-1 gap-4">
                    {Object.values(remoteUsers).map((user) => (
                        <div key={user.uid} className="border p-4 rounded">
                            <h3 className="text-xl mb-2">Remote User {user.uid}</h3>
                            <div 
                                ref={(ref: HTMLDivElement | null) => {
                                    if (ref && user.videoTrack) {
                                        ref.innerHTML = '';
                                        user.videoTrack.play(ref);
                                    }
                                }}
                                className="w-full h-[300px] md:h-[450px] bg-gray-100"
                            />
                        </div>
                    ))}
                    {Object.keys(remoteUsers).length === 0 && (
                        <div className="border p-4 rounded">
                            <h3 className="text-xl mb-2">Waiting for others...</h3>
                            <div className="w-full h-[300px] md:h-[450px] bg-gray-100 flex items-center justify-center">
                                <span>No other participants</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Add button to start and stop camera */}
            
        </div>
    );
};

export default VideoCall;