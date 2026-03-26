"""文件名元数据提取"""
import re
from typing import Dict
from dataclasses import dataclass


@dataclass
class FileMetadata:
    """文件元数据"""
    source: str          # 来源：LC押题、LK押题
    subject: str         # 科目：基础知识、法律法规
    date: str            # 时间：2023-05、2022-11
    set_number: int      # 套号：1、2、3...
    original_name: str   # 原始文件名


class MetadataExtractor:
    """从文件名提取元数据"""

    CHINESE_NUM_MAP = {
        "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
        "六": 6, "七": 7, "八": 8, "九": 9, "十": 10
    }

    SUBJECT_MAP = {
        "基础": "基础知识",
        "法规": "法律法规",
        "法律": "法律法规"
    }

    @classmethod
    def extract(cls, filename: str) -> FileMetadata:
        """从文件名提取元数据"""
        name = filename.replace(".docx", "").replace(".pdf", "")

        # 尝试匹配各种模式
        result = cls._try_pattern_1(name) or cls._try_pattern_2(name) or cls._try_default(name)

        result.original_name = filename
        return result

    @classmethod
    def _try_pattern_1(cls, name: str) -> FileMetadata:
        """匹配：2023年5月LC押题 基础第一套解析"""
        match = re.search(
            r"(\d{4})年(\d{1,2})月(LC|LK)押题\s*(基础|法规).*第([一二三四五六七八九十]+)套",
            name
        )
        if match:
            return FileMetadata(
                source=f"{match.group(3)}押题",
                subject=cls.SUBJECT_MAP.get(match.group(4), match.group(4)),
                date=f"{match.group(1)}-{match.group(2).zfill(2)}",
                set_number=cls.CHINESE_NUM_MAP.get(match.group(5), 1),
                original_name=""
            )
        return None

    @classmethod
    def _try_pattern_2(cls, name: str) -> FileMetadata:
        """匹配：11月期货基础LK押题第一套解析"""
        match = re.search(
            r"(\d{1,2})月期货(基础|法规)(LK|LC)押题.*第([一二三四五六七八九十]+)套",
            name
        )
        if match:
            return FileMetadata(
                source=f"{match.group(3)}押题",
                subject=cls.SUBJECT_MAP.get(match.group(2), match.group(2)),
                date=f"2022-{match.group(1).zfill(2)}",  # 默认2022年
                set_number=cls.CHINESE_NUM_MAP.get(match.group(4), 1),
                original_name=""
            )
        return None

    @classmethod
    def _try_default(cls, name: str) -> FileMetadata:
        """默认提取"""
        # 提取科目
        subject = "基础知识"
        if "法规" in name or "法律" in name:
            subject = "法律法规"

        # 提取套号
        set_number = 1
        num_match = re.search(r"第([一二三四五六七八九十\d]+)套", name)
        if num_match:
            num_str = num_match.group(1)
            set_number = cls.CHINESE_NUM_MAP.get(num_str, int(num_str) if num_str.isdigit() else 1)

        # 提取来源
        source = "通用"
        if "LC" in name:
            source = "LC押题"
        elif "LK" in name:
            source = "LK押题"

        return FileMetadata(
            source=source,
            subject=subject,
            date="",
            set_number=set_number,
            original_name=""
        )