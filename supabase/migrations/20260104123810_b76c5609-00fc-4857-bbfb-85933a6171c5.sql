-- Thêm role admin cho user hoangtydo88@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('72eceabe-2574-43cd-94be-f820da2fbe89', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;