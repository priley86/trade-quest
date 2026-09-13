SELECT p.first_name, p.last_name, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'priley86@gmail.com';