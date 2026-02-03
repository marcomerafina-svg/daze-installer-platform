/*
  # Fix Installers RLS - Remove Recursive Update Policy

  ## Problem
  The policy "Company owners can update team" also has the same recursive issue.

  ## Solution
  Drop this policy. Company owners will use admin functions to update team members,
  which bypass RLS with proper authorization checks.

  ## Changes
  1. Drop the "Company owners can update team" policy
*/

-- Drop the recursive update policy
DROP POLICY IF EXISTS "Company owners can update team" ON installers;

-- Company owners will use edge functions with service role to manage team
-- This is more secure and avoids RLS recursion issues
