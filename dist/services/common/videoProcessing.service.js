"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapJobStateToStatus = exports.VideoProcessingStatus = void 0;
// Video processing job status
var VideoProcessingStatus;
(function (VideoProcessingStatus) {
    VideoProcessingStatus["PENDING"] = "pending";
    VideoProcessingStatus["PROCESSING"] = "processing";
    VideoProcessingStatus["COMPLETED"] = "completed";
    VideoProcessingStatus["FAILED"] = "failed";
})(VideoProcessingStatus || (exports.VideoProcessingStatus = VideoProcessingStatus = {}));
/**
 * Map BullMQ job state to VideoProcessingStatus
 */
const mapJobStateToStatus = (state) => {
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
exports.mapJobStateToStatus = mapJobStateToStatus;
//# sourceMappingURL=videoProcessing.service.js.map