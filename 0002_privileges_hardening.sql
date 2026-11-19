-- سخت‌گیری دسترسی‌ها

-- نقش اپلیکیشن نباید به جدول مایگریشن‌ها دست بزند
revoke all on table _migrations from zt_app;

-- جدول‌ها و sequenceهای آینده (ساخته‌شده با نقش مالک) خودکار دسترسی بگیرند
alter default privileges in schema public grant select, insert, update, delete on tables to zt_app;
alter default privileges in schema public grant usage, select on sequences to zt_app;
-- توجه: _migrations بالاتر ساخته شده و تحت default privileges جدید نیست.
