import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { supabase } from "../../src/supabaseClient";
export default function Settings() {
  return (
    <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
      <Text>Settings</Text>
      <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{marginTop:16}}>
        <Text style={{color:"red"}}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
