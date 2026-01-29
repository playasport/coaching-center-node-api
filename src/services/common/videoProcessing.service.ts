// Video processing job status
export enum VideoProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Video processing request interface
export interface VideoProcessingRequest {
  videoUrl: string;
  highlightId?: string;
  reelId?: string;
  type: 'highlight' | 'reel';
  folderPath?: string;
  options?: {
    generateThumbnail?: boolean;
    generateHLS?: boolean;
    resolutions?: string[]; // e.g., ['360p', '480p', '720p', '1080p']
    quality?: 'low' | 'medium' | 'high';
  };
}

// Video processing response interface
export interface VideoProcessingResponse {
  jobId: string;
  status: VideoProcessingStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  hlsUrls?: {
    '360p'?: string;
    '480p'?: string;
    '720p'?: string;
    '1080p'?: string;
    [key: string]: string | undefined;
  };
  masterM3u8Url?: string;
  previewUrl?: string;
  duration?: number;
  metadata?: {
    fileSize?: number;
    resolution?: string;
    bitrate?: number;
    format?: string;
    [key: string]: any;
  };
}

// Video processing job status response
export interface VideoProcessingJobStatus {
  jobId: string;
  status: VideoProcessingStatus;
  progress?: number; // 0-100
  error?: string;
  result?: VideoProcessingResponse;
}

/**
 * Map BullMQ job state to VideoProcessingStatus
 */
export const mapJobStateToStatus = (state: string): VideoProcessingStatus => {
  switch (state) {
    case 'completed':
      return VideoProcessingStatus.COMPLETED;
    case 'failed':
      return VideoProcessingStatus.FAILED;
    case 'active':
      return VideoProcessingStatus.PROCESSING;
    case 'waiting':
    case 'delayed':
    default:
      return VideoProcessingStatus.PENDING;
  }
};
