# Reels Data Import

This JSON file contains reel data extracted from the SQL dump file.

## Important Notes

### userId Mapping
The `userId` field in the JSON file uses a placeholder format: `USER_ID_PLACEHOLDER_179`

**You need to replace these placeholders with actual MongoDB ObjectIds from your User collection.**

The SQL data shows `user_id: 179`, but in MongoDB this needs to be:
- An ObjectId reference to the User document
- You can find the actual ObjectId by querying your User collection

### Example Import Script

```typescript
import { connectDatabase } from '../src/config/database';
import { ReelModel } from '../src/models/reel.model';
import { UserModel } from '../src/models/user.model';
import reelData from './reels.json';
import { Types } from 'mongoose';

const importReels = async () => {
  await connectDatabase();

  // Find the user ObjectId based on the numeric ID (179 in SQL)
  // Option 1: If you have a mapping or know the user
  const user = await UserModel.findOne({ /* your criteria to find user 179 */ });
  if (!user) {
    throw new Error('User not found. Please map user_id 179 to an actual user ObjectId');
  }
  const userId = user._id;

  // Option 2: If you need to map by a different field, adjust the query accordingly

  // Replace placeholders and import
  const reelsToImport = reelData.map((reel) => ({
    ...reel,
    userId: new Types.ObjectId(userId), // Replace placeholder with actual ObjectId
  }));

  // Insert reels
  await ReelModel.insertMany(reelsToImport, { ordered: false });
  console.log(`✅ Imported ${reelsToImport.length} reels`);
};

importReels();
```

### Data Transformations

The following transformations were applied when converting from SQL to JSON:

1. **Field name conversions** (snake_case → camelCase):
   - `user_id` → `userId` (needs ObjectId mapping)
   - `sport_ids` → `sportIds` (parsed from JSON string to array)
   - `original_path` → `originalPath`
   - `folder_path` → `folderPath`
   - `thumbnail_path` → `thumbnailPath`
   - `video_proccessed_status` → `videoProcessedStatus`
   - `views_count` → `viewsCount`
   - `likes_count` → `likesCount`
   - `comments_count` → `commentsCount`
   - `created_at` → `createdAt`
   - `updated_at` → `updatedAt`
   - `deleted_at` → `deletedAt`

2. **sportIds**: Converted from JSON string (e.g., `"\"81ad71b9-...\""`) to array of strings
3. **Dates**: Converted to ISO 8601 format
4. **masterM3u8Url**: Added as `null` (new field, not in original SQL)
5. **NULL values**: Converted to JSON `null`

### Validation

Before importing, ensure:
- User ObjectIds are valid and exist in your User collection
- Sport IDs in `sportIds` arrays match existing sports in your Sport collection (if using references)
- Dates are in correct ISO format
- Status values match the `ReelStatus` enum: `approved`, `rejected`, `blocked`, `pending`
- VideoProcessedStatus values match the `VideoProcessedStatus` enum: `proccesing`, `failed`, `done`, ``
