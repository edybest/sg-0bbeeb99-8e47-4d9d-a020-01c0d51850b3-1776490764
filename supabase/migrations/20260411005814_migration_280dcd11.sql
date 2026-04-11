-- Remove all old unoptimized policies - Batch 4: gallery, mini_blok related, notifications

-- gallery_albums - remove old policies
DROP POLICY IF EXISTS "Admin and permitted members can delete albums" ON gallery_albums;
DROP POLICY IF EXISTS "Admin and permitted members can manage albums" ON gallery_albums;
DROP POLICY IF EXISTS "Admin and permitted members can update albums" ON gallery_albums;

-- gallery_images - remove old policies
DROP POLICY IF EXISTS "Admin and permitted members can delete images" ON gallery_images;
DROP POLICY IF EXISTS "Admin and permitted members can manage images" ON gallery_images;
DROP POLICY IF EXISTS "Admin and permitted members can update images" ON gallery_images;

-- notification_recipients - remove old policies
DROP POLICY IF EXISTS "Admins can create recipients" ON notification_recipients;
DROP POLICY IF EXISTS "Recipients can mark read" ON notification_recipients;
DROP POLICY IF EXISTS "Recipients can view their notifications" ON notification_recipients;

-- games - remove old policies
DROP POLICY IF EXISTS "auth_delete_games" ON games;
DROP POLICY IF EXISTS "auth_insert_games" ON games;
DROP POLICY IF EXISTS "auth_update_games" ON games;

-- nav_layout_settings - remove old policies
DROP POLICY IF EXISTS "Admins can write nav_layout_settings" ON nav_layout_settings;
DROP POLICY IF EXISTS "consolidated_manage_nav_layout_settings" ON nav_layout_settings;

-- fivefive_participants - remove old policies
DROP POLICY IF EXISTS "Members can register for 5-5 games" ON fivefive_participants;
DROP POLICY IF EXISTS "consolidated_manage_fivefive_participants" ON fivefive_participants;

-- mini_blok_shares - remove old policies
DROP POLICY IF EXISTS "Admins, owners, and collaborators can create shares" ON mini_blok_shares;
DROP POLICY IF EXISTS "Members can revoke their own shares" ON mini_blok_shares;