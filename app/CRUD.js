import { supabase } from "./utils/supabase/client";

export const fetchUserData = async () => {
    // First get the authenticated user's ID
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user?.id) return;

    // Then fetch the user's data from your users table
    const { data: userData, error } = await supabase
      .from('Profiles')  // replace with your actual table name if different
      .select('avatar, firstname, lastname')
      .eq('id', authData.user.id)
      .single();

    if (error) {
      console.error("Error fetching user data:", error);
    } else {
      return userData;
    }
};
