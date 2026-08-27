insert into public.sources (name,source_type,url,reliability_score) values
('CropCare AI Manual Seed','manual',null,0.50),
('Open-Meteo','api','https://open-meteo.com/',0.80)
on conflict do nothing;

insert into public.crops (common_name,scientific_name,category,season) values
('Wheat','Triticum aestivum','cereal','Rabi'),
('Rice','Oryza sativa','cereal','Kharif'),
('Maize','Zea mays','cereal','Kharif'),
('Cotton','Gossypium hirsutum','fiber','Kharif'),
('Soybean','Glycine max','oilseed','Kharif'),
('Chickpea','Cicer arietinum','pulse','Rabi')
on conflict (common_name) do nothing;

insert into public.crop_stages (crop_id,name,stage_order)
select id,'Sowing',1 from public.crops where common_name in ('Wheat','Rice','Maize','Cotton','Soybean','Chickpea')
on conflict do nothing;

insert into public.crop_stages (crop_id,name,stage_order)
select id,'Vegetative',2 from public.crops where common_name in ('Wheat','Rice','Maize','Cotton','Soybean','Chickpea')
on conflict do nothing;

insert into public.crop_stages (crop_id,name,stage_order)
select id,'Flowering',3 from public.crops where common_name in ('Wheat','Rice','Maize','Cotton','Soybean','Chickpea')
on conflict do nothing;
