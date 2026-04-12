const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: { full_name: fullName }
  }
});

// ❌ SUPPRIME OU METS EN COMMENTAIRE TOUTE CETTE PARTIE ❌
// const { error: profileError } = await supabase
//   .from('profiles')
//   .insert({ id: data.user.id, full_name: fullName, ... });
// if (profileError) throw profileError;
