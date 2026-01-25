# Knowledge Base Category System

## Overview
The Knowledge Base now features a **dynamic, freestyle category system** that allows partners to create and manage their own custom categories.

## Key Features

### 1. **Freestyle Category Creation**
- Partners can create any category they need
- No predefined categories - complete flexibility
- Each category includes:
  - Name (required)
  - Description (optional)
  - Color theme (8 color options)
  - Automatic article count tracking

### 2. **Category Management**
- **Create**: Click the "+" button in the Categories sidebar
- **Edit**: Hover over a category and click the menu button (...)
- **Delete**: Select "Delete" from the category menu
- **View**: All categories display with their article counts

### 3. **Color Customization**
Available colors for categories:
- Blue
- Green
- Purple
- Pink
- Yellow
- Red
- Indigo
- Orange

### 4. **Firebase Integration**
All categories are stored in Firestore collection: `knowledgeCategories`

**Category Schema:**
```typescript
{
  id: string;              // Auto-generated
  name: string;            // Category name
  description: string;     // Optional description
  color: string;           // Color theme
  count: number;           // Number of articles
  createdAt: Timestamp;    // Creation date
  createdBy: string;       // User ID of creator
  updatedAt: Timestamp;    // Last update
}
```

## Usage

### Creating a Category
1. Navigate to **Dashboard > Knowledge Base**
2. Click the **"+"** button in the Categories section
3. Fill in the category details:
   - Enter a category name
   - Add an optional description
   - Select a color theme
4. Click **"Create Category"**

### Editing a Category
1. Hover over the category you want to edit
2. Click the **"..."** menu button
3. Select **"Edit"**
4. Update the details
5. Click **"Update Category"**

### Deleting a Category
1. Hover over the category you want to delete
2. Click the **"..."** menu button
3. Select **"Delete"**
4. Confirm the deletion

## Next Steps

To complete the Knowledge Base system, you'll need to implement:

1. **Article Management**
   - Create/Edit/Delete articles
   - Assign articles to categories
   - Rich text editor for article content
   - Article status management (draft/review/published)

2. **Article Schema** (suggested):
   ```typescript
   {
     id: string;
     title: string;
     content: string;
     categoryId: string;
     categoryName: string;
     status: 'draft' | 'review' | 'published';
     views: number;
     createdAt: Timestamp;
     updatedAt: Timestamp;
     createdBy: string;
     tags: string[];
   }
   ```

3. **Search & Filtering**
   - Filter articles by category
   - Search by title/content
   - Sort by date, views, status

4. **Permissions** (if needed)
   - Role-based access control
   - Category ownership
   - Article approval workflow

## Technical Implementation

### Components
- **CategoryModal**: Modal for creating/editing categories
- **KnowledgeBasePage**: Main page with category sidebar and article list

### Firebase Collections
- `knowledgeCategories`: Stores all categories
- `knowledgeArticles`: (To be implemented) Stores all articles

### Real-time Updates
Categories automatically sync across all users using Firestore's real-time listeners.
