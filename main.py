import os
import asyncio
import discord
from discord import app_commands

TOKEN = "MTU2MTAyMTY3NjUxMzI2Nzc5NA.GnZpXX.exe1eVdOX-i9Fwz3MuVFWs40obUtKqU0ZBXeuo"
TARGET_CATEGORY_ID = 1561035181794525285

intents = discord.Intents.default()
client = discord.Client(
    intents=intents,
    allowed_mentions=discord.AllowedMentions.all(),
)
tree = app_commands.CommandTree(client)

running: dict[int, asyncio.Task] = {}

async def loop_worker(channel: discord.abc.Messageable, channel_id: int, text: str):
    sent = 0
    try:
        while True:
            msg = await channel.send(text)
            try:
                await msg.delete()
            except discord.NotFound:
                pass
            sent += 1
    except asyncio.CancelledError:
        raise
    except discord.Forbidden:
        print(f"[{channel_id}] 権限不足のため停止しました")
    except discord.HTTPException as e:
        print(f"[{channel_id}] HTTPエラーで停止しました: {e}")
    finally:
        running.pop(channel_id, None)
        print(f"[{channel_id}] ループ終了（計 {sent} 回実行）")

@tree.command(name="loop_start", description="【単体】現在のチャンネルで送信→削除の無限ループを最速で開始")
@app_commands.describe(text="送信する文言")
@app_commands.default_permissions(manage_messages=True)
async def loop_start(interaction: discord.Interaction, text: str):
    cid = interaction.channel_id
    if cid in running:
        await interaction.response.send_message("このチャンネルでは既にループ実行中です。/loop_stop で止めてください。", ephemeral=True)
        return
    
    running[cid] = asyncio.create_task(loop_worker(interaction.channel, cid, text))
    await interaction.response.send_message(
        f"開始しました：ストップされるまで「{text}」の送信→削除を無限に繰り返します", ephemeral=True)

@tree.command(name="loop_stop", description="【単体】現在のチャンネルの無限ループを停止")
@app_commands.default_permissions(manage_messages=True)
async def loop_stop(interaction: discord.Interaction):
    task = running.pop(interaction.channel_id, None)
    if task is None:
        await interaction.response.send_message("実行中のループはありません。", ephemeral=True)
        return
    task.cancel()
    await interaction.response.send_message("停止しました。", ephemeral=True)

@tree.command(name="category_loop_start", description="【カテゴリ一括】指定カテゴリ内の全チャンネルで無限ループを最速で開始")
@app_commands.describe(category="対象のカテゴリを選択", text="送信する文言")
@app_commands.default_permissions(manage_messages=True)
async def category_loop_start(interaction: discord.Interaction, category: discord.CategoryChannel, text: str):
    await interaction.response.defer(ephemeral=True)
    channels = category.text_channels
    if not channels:
        await interaction.followup.send("指定したカテゴリにテキストチャンネルがありません。")
        return

    started = 0
    skipped = 0
    for ch in channels:
        if ch.id in running:
            skipped += 1
            continue
        running[ch.id] = asyncio.create_task(loop_worker(ch, ch.id, text))
        started += 1

    await interaction.followup.send(
        f"カテゴリ「{category.name}」内の {started} チャンネルで一斉に開始しました。（スキップ: {skipped}件）\n※ /category_loop_stop で停止するまで続きます。"
    )

@tree.command(name="category_loop_stop", description="【カテゴリ一括】指定カテゴリ内の全チャンネルの無限ループを停止")
@app_commands.describe(category="対象のカテゴリを選択")
@app_commands.default_permissions(manage_messages=True)
async def category_loop_stop(interaction: discord.Interaction, category: discord.CategoryChannel):
    stopped = 0
    for ch in category.text_channels:
        task = running.pop(ch.id, None)
        if task:
            task.cancel()
            stopped += 1
    await interaction.response.send_message(f"カテゴリ「{category.name}」内の {stopped} チャンネルのループを停止しました。", ephemeral=True)

@tree.command(name="create_bocchi", description="閲覧専用チャンネルを追加（カテゴリが50個上限に達した場合は自動で新カテゴリを作成）")
@app_commands.describe(count="作成するチャンネルの数（最大50）")
@app_commands.default_permissions(manage_channels=True)
async def create_bocchi(interaction: discord.Interaction, count: int = 1):
    await interaction.response.defer(ephemeral=True)
    
    target_category = interaction.guild.get_channel(TARGET_CATEGORY_ID)
    if not isinstance(target_category, discord.CategoryChannel):
        await interaction.followup.send(f"❌ エラー：設定されたID ({TARGET_CATEGORY_ID}) の初期カテゴリが見つかりません。")
        return

    if count <= 0 or count > 50:
        await interaction.followup.send("作成数は1〜50の間で指定してください。")
        return

    overwrites = {
        interaction.guild.default_role: discord.PermissionOverwrite(view_channel=True, send_messages=False),
        interaction.guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, manage_messages=True)
    }

    created = 0
    current_category = target_category
    new_categories_created = 0
    error_msg = None
    
    for _ in range(count):
        # カテゴリ内のチャンネル数が上限(50)に達しているかチェック
        if len(current_category.channels) >= 50:
            try:
                # 新しいカテゴリを自動作成
                new_category_name = f"{target_category.name} - 拡張{new_categories_created + 1}"
                current_category = await interaction.guild.create_category(name=new_category_name)
                new_categories_created += 1
            except Exception as e:
                error_msg = f"新カテゴリ自動作成エラー: {e}"
                break

        try:
            await interaction.guild.create_text_channel(
                name="ぼっち・ざ・ろっく!", 
                category=current_category,
                overwrites=overwrites
            )
            created += 1
            await asyncio.sleep(0.5)
        except Exception as e:
            error_msg = f"チャンネル作成エラー: {e}"
            print(error_msg)
            break
            
    if created == 0 and error_msg:
        await interaction.followup.send(f"❌ 作成失敗（0個）。\n原因: `{error_msg}`")
    else:
        msg = f"一般ユーザー閲覧専用のチャンネルを {created} 個作成しました。"
        if new_categories_created > 0:
            msg += f"\n💡 既存カテゴリが上限に達したため、自動的に {new_categories_created} 個の新しいカテゴリを作成して続きを配置しました。"
        if error_msg:
            msg += f"\n⚠️ {created}個作成後にエラーで中断しました: `{error_msg}`"
        await interaction.followup.send(msg)

@tree.command(name="loop_status", description="全体のループ実行状況を表示")
async def loop_status(interaction: discord.Interaction):
    active_count = len(running)
    await interaction.response.send_message(f"現在、サーバー内の計 {active_count} チャンネルで無限ループが実行中です。", ephemeral=True)

@client.event
async def on_ready():
    await tree.sync()
    print(f"ログイン完了: {client.user}")

client.run(TOKEN)
