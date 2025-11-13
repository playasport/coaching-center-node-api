# AWS S3 Setup Guide

This guide walks you through setting up AWS S3 for profile image uploads in the PlayAsport Academy API.

---

## Prerequisites

- An AWS account (sign up at [aws.amazon.com](https://aws.amazon.com) if you don't have one)
- Access to AWS Console

---

## Step 1: Create an S3 Bucket

1. **Log in to AWS Console**
   - Go to [console.aws.amazon.com](https://console.aws.amazon.com)
   - Sign in with your AWS account credentials

2. **Navigate to S3**
   - In the AWS Console, search for "S3" in the services search bar
   - Click on **S3** to open the S3 dashboard

3. **Create a New Bucket**
   - Click the **"Create bucket"** button
   - Enter a unique bucket name (e.g., `playasport-profile-images`)
   - Select your preferred **AWS Region** (e.g., `us-east-1`, `ap-south-1`)
   - **Important:** Note the region you select, you'll need it for the `AWS_REGION` environment variable

4. **Configure Bucket Settings**
   - **Block Public Access:** 
     - For public image access, uncheck "Block all public access" (or configure specific public read access)
     - If you keep public access blocked, you'll need to use CloudFront or signed URLs
   - **Bucket Versioning:** Optional (can be disabled for cost savings)
   - **Default Encryption:** Recommended to enable (SSE-S3 or SSE-KMS)
   - Click **"Create bucket"**

5. **Configure Bucket Policy (for Public Read Access)**
   - After creating the bucket, click on it
   - Go to the **"Permissions"** tab
   - Scroll to **"Bucket policy"**
   - Click **"Edit"** and paste the following policy (replace `YOUR-BUCKET-NAME` with your actual bucket name):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
       }
     ]
   }
   ```

   - Click **"Save changes"**

6. **Important: ACLs are Disabled by Default**
   - Modern S3 buckets have ACLs (Access Control Lists) disabled by default
   - This means you **cannot** set `ACL: 'public-read'` on individual objects
   - Instead, use **bucket policies** (as shown above) to make objects publicly readable
   - The application code does **not** set ACLs on uploaded files - it relies on bucket policies
   - If you need to enable ACLs (not recommended), go to **"Permissions"** → **"Object Ownership"** → **"Edit"** → Select **"ACLs enabled"**

---

## Step 2: Create an IAM User for API Access

1. **Navigate to IAM**
   - In AWS Console, search for "IAM" in the services search bar
   - Click on **IAM** (Identity and Access Management)

2. **Create a New User**
   - Click **"Users"** in the left sidebar
   - Click **"Create user"**
   - Enter a username (e.g., `playasport-s3-uploader`)
   - Click **"Next"**

3. **Set Permissions**
   - Select **"Attach policies directly"**
   - Search for and select **"AmazonS3FullAccess"** (or create a custom policy with minimal permissions)
   - **Alternative (Recommended):** Create a custom policy with only the permissions needed:
     - Click **"Create policy"**
     - Switch to **"JSON"** tab
     - Paste the following policy (replace `YOUR-BUCKET-NAME`):

     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "s3:PutObject",
             "s3:GetObject",
             "s3:DeleteObject"
           ],
           "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
         },
         {
           "Effect": "Allow",
           "Action": [
             "s3:ListBucket"
           ],
           "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
         }
       ]
     }
     ```

     - Name the policy (e.g., `PlayAsportS3Access`)
     - Click **"Create policy"**
     - Go back to user creation and attach this custom policy

4. **Create Access Keys**
   - After creating the user, click on the username
   - Go to the **"Security credentials"** tab
   - Scroll to **"Access keys"** section
   - Click **"Create access key"**
   - Select **"Application running outside AWS"** as the use case
   - Click **"Next"**
   - Optionally add a description tag
   - Click **"Create access key"**

5. **Save Your Credentials**
   - **IMPORTANT:** You'll see the **Access Key ID** and **Secret Access Key**
   - Click **"Download .csv file"** to save them securely
   - **Copy both values immediately** - the secret key won't be shown again
   - Store them securely (password manager, secure file, etc.)

---

## Step 3: Configure Environment Variables

Add the following variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name-here
```

**Replace:**
- `your-access-key-id-here` with your Access Key ID from Step 2
- `your-secret-access-key-here` with your Secret Access Key from Step 2
- `us-east-1` with the region where you created your bucket
- `your-bucket-name-here` with your actual S3 bucket name

---

## Step 4: Verify Setup

1. **Restart your application** after adding the environment variables
2. **Test the upload** by making a PATCH request to `/academy/auth/profile` with a profile image
3. **Check S3 bucket** - you should see uploaded files in the `images/` folder

---

## Security Best Practices

1. **Never commit credentials to Git**
   - Ensure `.env` is in `.gitignore`
   - Use environment variables in production

2. **Use IAM Roles (for EC2/ECS deployments)**
   - Instead of access keys, use IAM roles when running on AWS infrastructure
   - More secure and easier to manage

3. **Rotate Access Keys Regularly**
   - Periodically create new access keys and update your environment variables
   - Delete old keys after confirming new ones work

4. **Limit Permissions**
   - Use the custom IAM policy (from Step 2) instead of full S3 access
   - Follow the principle of least privilege

5. **Enable MFA for IAM Users**
   - Add Multi-Factor Authentication to your AWS account
   - Protect your root account with MFA

6. **Monitor Usage**
   - Set up CloudWatch alarms for unusual S3 activity
   - Review IAM access reports regularly

---

## Troubleshooting

### Error: "Access Denied"
- Verify your access key ID and secret access key are correct
- Check that the IAM user has the necessary S3 permissions
- Ensure the bucket name in `AWS_S3_BUCKET` matches exactly

### Error: "Bucket not found"
- Verify the bucket exists in the specified region
- Check that `AWS_REGION` matches the bucket's region
- Ensure the bucket name is spelled correctly

### Images not publicly accessible
- Check bucket policy allows public read access
- Verify CORS configuration if accessing from web browsers
- Consider using CloudFront for better performance and security

### Error: "The bucket does not allow ACLs" or "S3 bucket has ACLs disabled"
- This is **normal** for modern S3 buckets - ACLs are disabled by default
- The application code does **not** use ACLs - it relies on bucket policies instead
- **Solution:** Ensure your bucket has a bucket policy that allows public read access (see Step 1, section 5)
- If you still see this error, it means the bucket policy might be missing or incorrect
- **Do NOT** enable ACLs on the bucket - use bucket policies instead (more secure and recommended by AWS)

### File upload fails
- Check file size (max 5MB)
- Verify file type is allowed (JPEG, PNG, WebP)
- Review application logs for detailed error messages

---

## Cost Considerations

- **Storage:** ~$0.023 per GB/month (varies by region)
- **Requests:** 
  - PUT requests: ~$0.005 per 1,000 requests
  - GET requests: ~$0.0004 per 1,000 requests
- **Data Transfer:** Free for first 100 GB/month (outbound)

For a typical application with moderate traffic, S3 costs are usually minimal.

---

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [S3 Pricing Calculator](https://calculator.aws/)

---

## Support

If you encounter issues:
1. Check AWS CloudWatch logs
2. Review application logs (`logs/application.log` in production)
3. Verify all environment variables are set correctly
4. Contact the PlayAsport backend team with relevant error messages

---

Happy uploading! 🚀

